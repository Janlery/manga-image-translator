import io
import os
import secrets
import shutil
import signal
import subprocess
import sys
from argparse import Namespace
import asyncio

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


from fastapi import FastAPI, Request, HTTPException, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from manga_translator import Config
from server.instance import ExecutorInstance, executor_instances
from server.myqueue import task_queue
from server.request_extraction import get_ctx, while_streaming, TranslateRequest, BatchTranslateRequest, get_batch_ctx, to_pil_image
from server.to_json import to_translation, TranslationResponse

app = FastAPI()
nonce = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加result文件夹静态文件服务
if os.path.exists("../result"):
    app.mount("/result", StaticFiles(directory="../result"), name="result")

@app.post("/register", response_description="no response", tags=["internal-api"])
async def register_instance(instance: ExecutorInstance, req: Request, req_nonce: str = Header(alias="X-Nonce")):
    if req_nonce != nonce:
        raise HTTPException(401, detail="Invalid nonce")
    instance.ip = req.client.host
    executor_instances.register(instance)

def transform_to_image(ctx):
    # 检查是否使用占位符（在web模式下final.png保存后会设置此标记）
    if hasattr(ctx, 'use_placeholder') and ctx.use_placeholder:
        # ctx.result已经是1x1占位符图片，快速传输
        img_byte_arr = io.BytesIO()
        ctx.result.save(img_byte_arr, format="PNG")
        return img_byte_arr.getvalue()

    # 返回完整的翻译结果
    img_byte_arr = io.BytesIO()
    ctx.result.save(img_byte_arr, format="PNG")
    return img_byte_arr.getvalue()

def transform_to_json(ctx):
    return to_translation(ctx).model_dump_json().encode("utf-8")

def transform_to_bytes(ctx):
    return to_translation(ctx).to_bytes()

@app.post("/translate/json", response_model=TranslationResponse, tags=["api", "json"],response_description="json strucure inspired by the ichigo translator extension")
async def json(req: Request, data: TranslateRequest):
    ctx = await get_ctx(req, data.config, data.image)
    return to_translation(ctx)

@app.post("/translate/bytes", response_class=StreamingResponse, tags=["api", "json"],response_description="custom byte structure for decoding look at examples in 'examples/response.*'")
async def bytes(req: Request, data: TranslateRequest):
    ctx = await get_ctx(req, data.config, data.image)
    return StreamingResponse(content=to_translation(ctx).to_bytes())

@app.post("/translate/image", response_description="the result image", tags=["api", "json"],response_class=StreamingResponse)
async def image(req: Request, data: TranslateRequest) -> StreamingResponse:
    ctx = await get_ctx(req, data.config, data.image)
    img_byte_arr = io.BytesIO()
    ctx.result.save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)

    return StreamingResponse(img_byte_arr, media_type="image/png")

@app.post("/translate/json/stream", response_class=StreamingResponse,tags=["api", "json"], response_description="A stream over elements with strucure(1byte status, 4 byte size, n byte data) status code are 0,1,2,3,4 0 is result data, 1 is progress report, 2 is error, 3 is waiting queue position, 4 is waiting for translator instance")
async def stream_json(req: Request, data: TranslateRequest) -> StreamingResponse:
    return await while_streaming(req, transform_to_json, data.config, data.image)

@app.post("/translate/bytes/stream", response_class=StreamingResponse, tags=["api", "json"],response_description="A stream over elements with strucure(1byte status, 4 byte size, n byte data) status code are 0,1,2,3,4 0 is result data, 1 is progress report, 2 is error, 3 is waiting queue position, 4 is waiting for translator instance")
async def stream_bytes(req: Request, data: TranslateRequest)-> StreamingResponse:
    return await while_streaming(req, transform_to_bytes,data.config, data.image)

@app.post("/translate/image/stream", response_class=StreamingResponse, tags=["api", "json"], response_description="A stream over elements with strucure(1byte status, 4 byte size, n byte data) status code are 0,1,2,3,4 0 is result data, 1 is progress report, 2 is error, 3 is waiting queue position, 4 is waiting for translator instance")
async def stream_image(req: Request, data: TranslateRequest) -> StreamingResponse:
    return await while_streaming(req, transform_to_image, data.config, data.image)

@app.post("/translate/with-form/json", response_model=TranslationResponse, tags=["api", "form"],response_description="json strucure inspired by the ichigo translator extension")
async def json_form(req: Request, image: UploadFile = File(...), config: str = Form("{}")):
    img = await image.read()
    conf = Config.parse_raw(config)
    ctx = await get_ctx(req, conf, img)
    return to_translation(ctx)

@app.post("/translate/with-form/bytes", response_class=StreamingResponse, tags=["api", "form"],response_description="custom byte structure for decoding look at examples in 'examples/response.*'")
async def bytes_form(req: Request, image: UploadFile = File(...), config: str = Form("{}")):
    img = await image.read()
    conf = Config.parse_raw(config)
    ctx = await get_ctx(req, conf, img)
    return StreamingResponse(content=to_translation(ctx).to_bytes())

@app.post("/translate/with-form/image", response_description="the result image", tags=["api", "form"],response_class=StreamingResponse)
async def image_form(req: Request, image: UploadFile = File(...), config: str = Form("{}")) -> StreamingResponse:
    img = await image.read()
    conf = Config.parse_raw(config)
    ctx = await get_ctx(req, conf, img)
    img_byte_arr = io.BytesIO()
    ctx.result.save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)

    return StreamingResponse(img_byte_arr, media_type="image/png")

@app.post("/translate/with-form/json/stream", response_class=StreamingResponse, tags=["api", "form"],response_description="A stream over elements with strucure(1byte status, 4 byte size, n byte data) status code are 0,1,2,3,4 0 is result data, 1 is progress report, 2 is error, 3 is waiting queue position, 4 is waiting for translator instance")
async def stream_json_form(req: Request, image: UploadFile = File(...), config: str = Form("{}")) -> StreamingResponse:
    img = await image.read()
    conf = Config.parse_raw(config)
    # 标记这是Web前端调用，用于占位符优化
    conf._is_web_frontend = True
    return await while_streaming(req, transform_to_json, conf, img)



@app.post("/translate/with-form/bytes/stream", response_class=StreamingResponse,tags=["api", "form"], response_description="A stream over elements with strucure(1byte status, 4 byte size, n byte data) status code are 0,1,2,3,4 0 is result data, 1 is progress report, 2 is error, 3 is waiting queue position, 4 is waiting for translator instance")
async def stream_bytes_form(req: Request, image: UploadFile = File(...), config: str = Form("{}"))-> StreamingResponse:
    img = await image.read()
    conf = Config.parse_raw(config)
    return await while_streaming(req, transform_to_bytes, conf, img)

@app.post("/translate/with-form/image/stream", response_class=StreamingResponse, tags=["api", "form"], response_description="Standard streaming endpoint - returns complete image data. Suitable for API calls and scripts.")
async def stream_image_form(req: Request, image: UploadFile = File(...), config: str = Form("{}")) -> StreamingResponse:
    """通用流式端点：返回完整图片数据，适用于API调用和comicread脚本"""
    img = await image.read()
    conf = Config.parse_raw(config)
    # 标记为通用模式，不使用占位符优化
    conf._web_frontend_optimized = False
    # 传递原始文件名
    filename = image.filename or "unknown.png"
    return await while_streaming(req, transform_to_image, conf, img, filename=filename)

@app.post("/translate/with-form/image/stream/web", response_class=StreamingResponse, tags=["api", "form"], response_description="Web frontend optimized streaming endpoint - uses placeholder optimization for faster response.")
async def stream_image_form_web(req: Request, image: UploadFile = File(...), config: str = Form("{}")) -> StreamingResponse:
    """Web前端专用端点：使用占位符优化，提供极速体验"""
    img = await image.read()
    conf = Config.parse_raw(config)
    # 标记为Web前端优化模式，使用占位符优化
    conf._web_frontend_optimized = True
    # 传递原始文件名
    filename = image.filename or "unknown.png"
    return await while_streaming(req, transform_to_image, conf, img, filename=filename)

@app.post("/queue-size", response_model=int, tags=["api", "json"])
async def queue_size() -> int:
    return len(task_queue.queue)


@app.api_route("/result/{folder_name}/final.png", methods=["GET", "HEAD"], tags=["api", "file"])
async def get_result_by_folder(folder_name: str):
    """根据文件夹名称获取翻译结果图片"""
    result_dir = "../result"
    if not os.path.exists(result_dir):
        raise HTTPException(404, detail="Result directory not found")

    folder_path = os.path.join(result_dir, folder_name)
    if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
        raise HTTPException(404, detail=f"Folder {folder_name} not found")

    final_png_path = os.path.join(folder_path, "final.png")
    if not os.path.exists(final_png_path):
        raise HTTPException(404, detail="final.png not found in folder")

    async def file_iterator():
        with open(final_png_path, "rb") as f:
            yield f.read()

    return StreamingResponse(
        file_iterator(),
        media_type="image/png",
        headers={"Content-Disposition": f"inline; filename=final.png"}
    )

@app.post("/translate/batch/json", response_model=list[TranslationResponse], tags=["api", "json", "batch"])
async def batch_json(req: Request, data: BatchTranslateRequest):
    """Batch translate images and return JSON format results"""
    results = await get_batch_ctx(req, data.config, data.images, data.batch_size)
    return [to_translation(ctx) for ctx in results]

@app.post("/translate/batch/images", response_description="Zip file containing translated images", tags=["api", "batch"])
async def batch_images(req: Request, data: BatchTranslateRequest):
    """Batch translate images and return zip archive containing translated images"""
    import zipfile
    import tempfile
    
    results = await get_batch_ctx(req, data.config, data.images, data.batch_size)
    
    # 使用内存流代替临时文件，减少磁盘I/O
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for i, ctx in enumerate(results):
            if ctx.result:
                img_byte_arr = io.BytesIO()
                ctx.result.save(img_byte_arr, format="PNG")
                zip_file.writestr(f"translated_{i+1}.png", img_byte_arr.getvalue())
                del img_byte_arr  # 立即释放
    
    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=translated_images.zip"}
    )

@app.post("/translate/batch/context/stream", response_class=StreamingResponse, tags=["api", "batch"])
async def batch_context_stream(
    req: Request, 
    images: list[UploadFile] = File(...), 
    config: str = Form("{}"),
    batch_name: str = Form("批次1")
) -> StreamingResponse:
    """
    批次上下文翻译：同一批次的图片一起OCR，合并文本后批量翻译，保持上下文关联
    结果保存到 result/{session}/{batch_name}/ 文件夹
    """
    from server.request_extraction import get_batch_context_stream
    import logging
    logger = logging.getLogger('manga_translator')
    
    logger.info(f"Batch: {batch_name}, {len(images)} imgs")
    
    # 读取所有图片并立即清理
    pil_images = []
    for img in images:
        img_data = await img.read()
        pil_img = await to_pil_image(img_data)
        pil_images.append(pil_img)
        del img_data  # 立即释放
    
    conf = Config.parse_raw(config)
    messages = asyncio.Queue()
    
    async def process_batch():
        try:
            await get_batch_context_stream(req, conf, pil_images, batch_name, messages)
            logger.info(f"Batch done: {batch_name}")
        except Exception as e:
            import traceback
            logger.error(f"Batch error: {str(e)}\n{traceback.format_exc()}")
            error_data = str(e).encode('utf-8')
            await messages.put(bytes([2]) + len(error_data).to_bytes(4, 'big') + error_data)
        finally:
            pil_images.clear()
            await messages.put(None)
    
    asyncio.create_task(process_batch())
    
    async def stream_generator():
        while True:
            msg = await messages.get()
            if msg is None:
                break
            yield msg
    
    return StreamingResponse(stream_generator(), media_type="application/octet-stream")

@app.get("/", response_class=HTMLResponse,tags=["ui"])
async def index() -> HTMLResponse:
    script_directory = Path(__file__).parent
    html_file = script_directory / "index.html"
    html_content = html_file.read_text(encoding="utf-8")
    return HTMLResponse(content=html_content)

@app.get("/manual", response_class=HTMLResponse, tags=["ui"])
async def manual():
    script_directory = Path(__file__).parent
    html_file = script_directory / "manual.html"
    html_content = html_file.read_text(encoding="utf-8")
    return HTMLResponse(content=html_content)

def generate_nonce():
    return secrets.token_hex(16)

def start_translator_client_proc(host: str, port: int, nonce: str, params: Namespace):
    cmds = [
        sys.executable,
        '-m', 'manga_translator',
        'shared',
        '--host', host,
        '--port', str(port),
        '--nonce', nonce,
    ]
    if params.use_gpu:
        cmds.append('--use-gpu')
    if params.use_gpu_limited:
        cmds.append('--use-gpu-limited')
    if params.ignore_errors:
        cmds.append('--ignore-errors')
    if params.verbose:
        cmds.append('--verbose')
    if params.models_ttl:
        cmds.append('--models-ttl=%s' % params.models_ttl)
    if getattr(params, 'pre_dict', None):
        cmds.extend(['--pre-dict', params.pre_dict])
    if getattr(params, 'post_dict', None):
        cmds.extend(['--post-dict', params.post_dict])       
    base_path = os.path.dirname(os.path.abspath(__file__))
    parent = os.path.dirname(base_path)
    proc = subprocess.Popen(cmds, cwd=parent)
    executor_instances.register(ExecutorInstance(ip=host, port=port))

    def handle_exit_signals(signal, frame):
        proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_exit_signals)
    signal.signal(signal.SIGTERM, handle_exit_signals)

    return proc

def prepare(args):
    global nonce
    if args.nonce is None:
        nonce = os.getenv('MT_WEB_NONCE', generate_nonce())
    else:
        nonce = args.nonce
    if args.start_instance:
        return start_translator_client_proc(args.host, args.port + 1, nonce, args)
    folder_name= "upload-cache"
    if os.path.exists(folder_name):
        shutil.rmtree(folder_name)
    os.makedirs(folder_name)

@app.post("/simple_execute/translate_batch", tags=["internal-api"])
async def simple_execute_batch(req: Request, data: BatchTranslateRequest):
    """Internal batch translation execution endpoint"""
    # 使用全局单例翻译器实例，避免内存增长
    from server.request_extraction import get_or_create_batch_translator
    translator = await get_or_create_batch_translator()
    
    # Prepare image-config pairs
    images_with_configs = [(img, data.config) for img in data.images]
    
    # Execute batch translation
    results = await translator.translate_batch(images_with_configs, data.batch_size)
    
    return results

@app.post("/execute/translate_batch", tags=["internal-api"])
async def execute_batch_stream(req: Request, data: BatchTranslateRequest):
    """Internal batch translation streaming execution endpoint"""
    # 使用全局单例翻译器实例，避免内存增长
    from server.request_extraction import get_or_create_batch_translator
    translator = await get_or_create_batch_translator()
    
    # Prepare image-config pairs
    images_with_configs = [(img, data.config) for img in data.images]
    
    # Execute batch translation (streaming version requires more complex implementation)
    results = await translator.translate_batch(images_with_configs, data.batch_size)
    
    return results

@app.api_route("/result/{session_folder}/{batch_name}/{filename}", methods=["GET", "HEAD"], tags=["api", "file"])
async def get_batch_result_image(session_folder: str, batch_name: str, filename: str):
    """获取批次翻译结果图片"""
    result_dir = "../result"
    file_path = os.path.join(result_dir, session_folder, batch_name, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(404, detail=f"File not found: {filename}")
    
    async def file_iterator():
        with open(file_path, "rb") as f:
            yield f.read()
    
    return StreamingResponse(
        file_iterator(),
        media_type="image/png",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )

@app.get("/results/sessions", tags=["api"])
async def list_sessions():
    """List all session directories with their batches"""
    result_dir = "../result"
    if not os.path.exists(result_dir):
        return {"sessions": []}
    
    try:
        sessions = []
        for session_name in os.listdir(result_dir):
            session_path = os.path.join(result_dir, session_name)
            if not os.path.isdir(session_path):
                continue
            
            batches = []
            for batch_name in os.listdir(session_path):
                batch_path = os.path.join(session_path, batch_name)
                if not os.path.isdir(batch_path):
                    continue
                
                # 使用生成器表达式减少内存占用
                images = sorted(f for f in os.listdir(batch_path) if f.endswith('_final.png'))
                if images:
                    batches.append({
                        "name": batch_name,
                        "image_count": len(images),
                        "images": images
                    })
            
            if batches:
                sessions.append({
                    "name": session_name,
                    "batches": batches
                })
        
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@app.get("/results/list", tags=["api"])
async def list_results():
    """List all result directories"""
    result_dir = "../result"
    if not os.path.exists(result_dir):
        return {"directories": []}
    
    try:
        # 使用列表推导式，更简洁高效
        directories = [
            item for item in os.listdir(result_dir)
            if os.path.isdir(os.path.join(result_dir, item))
            and os.path.exists(os.path.join(result_dir, item, "final.png"))
        ]
        return {"directories": directories}
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@app.delete("/results/clear", tags=["api"])
async def clear_results():
    """Delete all result directories"""
    result_dir = "../result"
    if not os.path.exists(result_dir):
        return {"message": "No results directory found"}
    
    try:
        deleted_count = 0
        for item in os.listdir(result_dir):
            item_path = os.path.join(result_dir, item)
            if not os.path.isdir(item_path):
                continue
            
            if os.path.exists(os.path.join(item_path, "final.png")):
                shutil.rmtree(item_path)
                deleted_count += 1
        
        return {"message": f"Deleted {deleted_count} directories"}
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@app.delete("/results/{folder_name}", tags=["api"])
async def delete_result(folder_name: str):
    """Delete a specific result directory"""
    result_dir = "../result"
    folder_path = os.path.join(result_dir, folder_name)
    
    if not os.path.exists(folder_path):
        raise HTTPException(404, detail="Directory not found")
    
    try:
        if not os.path.exists(os.path.join(folder_path, "final.png")):
            raise HTTPException(404, detail="Result file not found")
        
        shutil.rmtree(folder_path)
        return {"message": f"Deleted: {folder_name}"}
    except Exception as e:
        raise HTTPException(500, detail=str(e))

#todo: restart if crash
#todo: cache results
#todo: cleanup cache

if __name__ == '__main__':
    import uvicorn
    from args import parse_arguments

    args = parse_arguments()
    args.start_instance = True
    proc = prepare(args)
    print("Nonce: "+nonce)
    try:
        uvicorn.run(app, host=args.host, port=args.port)
    except Exception:
        if proc:
            proc.terminate()
