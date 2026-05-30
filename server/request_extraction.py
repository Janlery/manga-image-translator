import asyncio
import builtins
import io
import re
from base64 import b64decode
from typing import Union

import requests
from PIL import Image
from fastapi import Request, HTTPException
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

from manga_translator import Config
from server.myqueue import task_queue, wait_in_queue, QueueElement, BatchQueueElement
from server.streaming import notify, stream

# 全局 MangaTranslator 实例，用于批次翻译（避免每次创建新实例导致内存增长）
_batch_translator_instance = None
_batch_translator_lock = asyncio.Lock()

class TranslateRequest(BaseModel):
    """This request can be a multipart or a json request"""
    image: bytes|str
    """can be a url, base64 encoded image or a multipart image"""
    config: Config = Config()
    """in case it is a multipart this needs to be a string(json.stringify)"""

class BatchTranslateRequest(BaseModel):
    """Batch translation request"""
    images: list[bytes|str]
    """List of images, can be URLs, base64 encoded strings, or binary data"""
    config: Config = Config()
    """Translation configuration"""
    batch_size: int = 4
    """Batch size, default is 4"""

async def to_pil_image(image: Union[str, bytes]) -> Image.Image:
    try:
        if isinstance(image, builtins.bytes):
            image = Image.open(io.BytesIO(image))
            return image
        else:
            if re.match(r'^data:image/.+;base64,', image):
                value = image.split(',', 1)[1]
                image_data = b64decode(value)
                image = Image.open(io.BytesIO(image_data))
                return image
            else:
                response = requests.get(image)
                image = Image.open(io.BytesIO(response.content))
                return image
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


async def get_ctx(req: Request, config: Config, image: str|bytes):
    image = await to_pil_image(image)

    task = QueueElement(req, image, config, 0)
    task_queue.add_task(task)

    return await wait_in_queue(task, None)

async def while_streaming(req: Request, transform, config: Config, image: bytes | str, filename: str = None):
    image = await to_pil_image(image)

    task = QueueElement(req, image, config, 0, filename=filename)
    task_queue.add_task(task)

    messages = asyncio.Queue()

    def notify_internal(code: int, data: bytes) -> None:
        notify(code, data, transform, messages)
    streaming_response = StreamingResponse(stream(messages), media_type="application/octet-stream")
    asyncio.create_task(wait_in_queue(task, notify_internal))
    return streaming_response

async def get_batch_ctx(req: Request, config: Config, images: list[str|bytes], batch_size: int = 4):
    """Process batch translation request"""
    # Convert images to PIL Image objects
    pil_images = []
    for img in images:
        pil_img = await to_pil_image(img)
        pil_images.append(pil_img)
    
    # Create batch task
    batch_task = BatchQueueElement(req, pil_images, config, batch_size)
    task_queue.add_task(batch_task)
    
    return await wait_in_queue(batch_task, None)

async def get_or_create_batch_translator():
    """
    获取或创建全局批次翻译器实例（单例模式）
    优先复用 shared 模式的翻译器实例，避免重复加载模型
    
    返回 None 表示应该使用 shared 模式的翻译器
    """
    global _batch_translator_instance
    import logging
    logger = logging.getLogger('manga_translator')
    
    async with _batch_translator_lock:
        # 检查是否有 shared 模式的执行器实例
        try:
            from server.instance import executor_instances
            if executor_instances.list and len(executor_instances.list) > 0:
                # 使用 shared 模式的翻译器，避免重复加载模型
                logger.info("Using shared mode translator (no duplicate loading)")
                return None  # 返回 None 表示使用 shared 模式
        except Exception as e:
            logger.debug(f"Shared mode check failed: {e}")
        
        # 如果没有 shared 模式，创建本地实例（仅在没有 shared 模式时）
        if _batch_translator_instance is None:
            from manga_translator import MangaTranslator
            logger.info("Creating local translator for batch")
            _batch_translator_instance = MangaTranslator({
                'verbose': False,
                'kernel_size': 3,
                'use_gpu': True,
                'ignore_errors': True,
            })
            logger.info(f"Local translator ready, device: {_batch_translator_instance.device}")
        
        return _batch_translator_instance


async def get_batch_context_stream(req: Request, config: Config, images: list, batch_name: str, messages: asyncio.Queue):
    """
    批次上下文翻译流处理：
    优先使用 shared 模式的翻译器，避免重复加载模型
    """
    import os
    import json
    import logging
    logger = logging.getLogger('manga_translator')
    
    async def send_progress(msg: str):
        data = msg.encode('utf-8')
        await messages.put(bytes([1]) + len(data).to_bytes(4, 'big') + data)
    
    async def send_result(image_index: int, success: bool, session_folder: str = None, error: str = None):
        result = {"image_index": image_index, "success": success}
        if session_folder:
            result["session_folder"] = session_folder
        if error:
            result["error"] = error
        data = json.dumps(result).encode('utf-8')
        await messages.put(bytes([0]) + len(data).to_bytes(4, 'big') + data)
    
    async def send_error(msg: str):
        data = msg.encode('utf-8')
        await messages.put(bytes([2]) + len(data).to_bytes(4, 'big') + data)
    
    try:
        logger.info(f"Batch: {batch_name}, {len(images)} imgs")
        await send_progress(f"开始处理批次: {batch_name}, 共 {len(images)} 张图片")
        
        # 获取翻译器实例（优先使用 shared 模式，避免重复加载）
        translator = await get_or_create_batch_translator()
        
        if translator is None:
            # 使用 shared 模式的翻译器（避免重复加载模型）
            logger.info("Delegating to shared mode translator")
            from server.instance import executor_instances
            instance = await executor_instances.find_executor()
            
            try:
                # 将批次任务委托给 shared 模式处理
                # 这样可以复用已加载的模型，避免内存浪费
                import pickle
                import aiohttp
                
                method_data = pickle.dumps({
                    'images': images,
                    'config': config,
                    'batch_name': batch_name
                })
                
                url = f"http://{instance.ip}:{instance.port}/execute/translate_batch_with_context"
                headers = instance._nonce_headers()
                
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, data=method_data, headers=headers) as response:
                        async for chunk in response.content.iter_any():
                            if not chunk or len(chunk) < 5:
                                continue
                            
                            status = chunk[0]
                            size = int.from_bytes(chunk[1:5], 'big')
                            data = chunk[5:5+size]
                            
                            if status == 0:  # 结果
                                result_data = pickle.loads(data)
                                session_folder = os.path.basename(result_data.get('session_folder', ''))
                                await send_progress(f"session_folder:{session_folder}")
                                
                                for i, ctx in enumerate(result_data.get('results', [])):
                                    success = ctx and ctx.result
                                    await send_result(i, success, session_folder, None if success else "翻译失败")
                            elif status == 1:  # 进度
                                await send_progress(data.decode('utf-8'))
                            elif status == 2:  # 错误
                                await send_error(data.decode('utf-8'))
                                break
                
                await send_progress(f"批次 {batch_name} 翻译完成")
                logger.info(f"Batch done: {batch_name}")
            finally:
                await executor_instances.free_executor(instance)
        else:
            # 使用本地翻译器实例（仅在没有 shared 模式时）
            logger.info(f"Using local translator, device: {translator.device}")
            
            session_folder = os.path.basename(translator._session_folder)
            await send_progress(f"session_folder:{session_folder}")
            
            results = await translator.translate_batch_with_context(images, config, batch_name, send_progress)
            
            success_count = 0
            for i, ctx in enumerate(results):
                success = ctx and ctx.result
                if success:
                    success_count += 1
                await send_result(i, success, session_folder, None if success else "翻译失败")
            
            await send_progress(f"批次 {batch_name} 翻译完成")
            logger.info(f"Batch done: {batch_name}, {success_count}/{len(results)} ok")
        
    except Exception as e:
        import traceback
        error_msg = f"批次翻译错误: {str(e)}\n{traceback.format_exc()}"
        logger.error(f"Batch error: {error_msg}")
        await send_error(error_msg)
    finally:
        # 清理传入的图片列表（释放内存）
        try:
            if images:
                for img in images:
                    if hasattr(img, 'close'):
                        try:
                            img.close()
                        except Exception:
                            pass
                images.clear()
            
            # 触发垃圾回收
            import gc
            gc.collect()
            
            # 清理 GPU 缓存
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except ImportError:
                pass
            
            logger.debug("Request cleanup completed")
        except Exception as cleanup_error:
            logger.warning(f"Cleanup warning: {cleanup_error}")