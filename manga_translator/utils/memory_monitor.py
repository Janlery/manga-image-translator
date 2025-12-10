"""
内存监控工具
用于诊断和追踪内存使用情况
"""
import gc
import logging
from typing import Optional

logger = logging.getLogger('manga_translator')

def get_memory_info() -> dict:
    """获取当前内存使用信息"""
    info = {}
    
    try:
        import psutil
        process = psutil.Process()
        mem_info = process.memory_info()
        info['rss_mb'] = mem_info.rss / 1024 / 1024  # 物理内存 (MB)
        info['vms_mb'] = mem_info.vms / 1024 / 1024  # 虚拟内存 (MB)
    except ImportError:
        info['rss_mb'] = 0
        info['vms_mb'] = 0
    
    try:
        import torch
        if torch.cuda.is_available():
            info['gpu_allocated_mb'] = torch.cuda.memory_allocated() / 1024 / 1024
            info['gpu_reserved_mb'] = torch.cuda.memory_reserved() / 1024 / 1024
        else:
            info['gpu_allocated_mb'] = 0
            info['gpu_reserved_mb'] = 0
    except ImportError:
        info['gpu_allocated_mb'] = 0
        info['gpu_reserved_mb'] = 0
    
    return info

def log_memory_usage(prefix: str = ""):
    """记录当前内存使用情况"""
    info = get_memory_info()
    logger.info(
        f"{prefix}Memory: "
        f"RSS={info['rss_mb']:.1f}MB, "
        f"VMS={info['vms_mb']:.1f}MB, "
        f"GPU={info['gpu_allocated_mb']:.1f}MB/{info['gpu_reserved_mb']:.1f}MB"
    )

def force_cleanup():
    """强制清理内存"""
    gc.collect()
    gc.collect()
    
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
    except ImportError:
        pass

def get_large_objects(limit: int = 10):
    """获取占用内存最大的对象（用于调试）"""
    import sys
    
    objects = []
    for obj in gc.get_objects():
        try:
            size = sys.getsizeof(obj)
            if size > 1024 * 1024:  # 大于 1MB
                objects.append((type(obj).__name__, size / 1024 / 1024))
        except:
            pass
    
    objects.sort(key=lambda x: x[1], reverse=True)
    return objects[:limit]

def log_large_objects(limit: int = 10):
    """记录占用内存最大的对象"""
    objects = get_large_objects(limit)
    if objects:
        logger.info(f"Top {limit} large objects:")
        for obj_type, size_mb in objects:
            logger.info(f"  {obj_type}: {size_mb:.1f}MB")
