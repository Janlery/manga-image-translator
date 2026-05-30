import asyncio
import io
import os
import pickle
import subprocess
import sys

import numpy as np
from PIL import Image

from manga_translator.detection.common_rust import RustDetector, get_session
from manga_translator.utils import Quadrilateral, get_logger


class PaddleDetector(RustDetector):
    def __init__(self):
        self._logger = get_logger('paddle')
        self._use_subprocess = self._should_use_subprocess()
        self._worker_path = os.path.join(os.path.dirname(__file__), 'paddle_worker.py')
        if self._use_subprocess:
            self.det = None
            return
        super().__init__(get_session().paddle_detector())

    def _should_use_subprocess(self) -> bool:
        value = os.getenv('MT_PADDLE_DET_SUBPROCESS', '').strip().lower()
        if value in ('1', 'true', 'yes', 'on'):
            return True
        if value in ('0', 'false', 'no', 'off'):
            return False
        return sys.platform == 'win32'

    async def load(self, device: str, *args, **kwargs):
        if self._use_subprocess:
            return
        await super().load(device, *args, **kwargs)

    async def unload(self):
        if self._use_subprocess:
            return
        await super().unload()

    def is_loaded(self) -> bool:
        if self._use_subprocess:
            return True
        return super().is_loaded()

    async def detect(self, image: np.ndarray, detect_size: int, text_threshold: float, box_threshold: float,
                     unclip_ratio: float, invert: bool, gamma_correct: bool, rotate: bool,
                     auto_rotate: bool = False, verbose: bool = False):
        if not self._use_subprocess:
            return await super().detect(
                image, detect_size, text_threshold, box_threshold, unclip_ratio,
                invert, gamma_correct, rotate, auto_rotate, verbose
            )
        return await asyncio.to_thread(
            self._detect_via_subprocess,
            image, detect_size, text_threshold, box_threshold, unclip_ratio,
            invert, gamma_correct, rotate, auto_rotate
        )

    def _detect_via_subprocess(self, image: np.ndarray, detect_size: int, text_threshold: float, box_threshold: float,
                               unclip_ratio: float, invert: bool, gamma_correct: bool, rotate: bool,
                               auto_rotate: bool):
        img = Image.fromarray(image)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        payload = {
            'image_bytes': buf.getvalue(),
            'options': {
                'detect_size': int(detect_size),
                'unclip_ratio': float(unclip_ratio),
                'text_threshold': float(text_threshold),
                'box_threshold': float(box_threshold),
                'invert': bool(invert),
                'gamma_correct': bool(gamma_correct),
                'rotate': bool(rotate),
                'auto_rotate': bool(auto_rotate),
            },
        }

        repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        env = os.environ.copy()
        # Prepend the rusty_manga_image_translator package directory so its bundled DLLs
        # (e.g. cudnn64_9.dll) are found before any conflicting system/venv DLLs on Windows.
        try:
            import rusty_manga_image_translator as _rmt
            rmt_dir = os.path.dirname(_rmt.__file__)
            env['PATH'] = rmt_dir + os.pathsep + env.get('PATH', '')
        except ImportError:
            pass
        nvidia_paths = []
        for pkg in ['nvidia.cudnn', 'nvidia.cublas', 'nvidia.cuda_runtime', 'nvidia.cufft', 'nvidia.curand', 'nvidia.cusolver', 'nvidia.cusparse']:
            try:
                mod = __import__(pkg, fromlist=['__file__'])
                pkg_bin = os.path.join(os.path.dirname(mod.__file__), 'bin')
                if os.path.isdir(pkg_bin):
                    nvidia_paths.append(pkg_bin)
            except ImportError:
                pass
        if nvidia_paths:
            env['PATH'] = os.pathsep.join(nvidia_paths) + os.pathsep + env.get('PATH', '')
        proc = subprocess.run(
            [sys.executable, self._worker_path],
            input=pickle.dumps(payload),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=repo_root,
            env=env,
            check=False,
        )
        if proc.returncode != 0:
            stderr = proc.stderr.decode('utf-8', errors='replace').strip()
            raise RuntimeError(f'Paddle detector worker failed: {stderr or "unknown error"}')

        result = pickle.loads(proc.stdout)
        textlines = [
            Quadrilateral(np.array(pts, dtype=np.int64), '', score)
            for pts, score in result['areas']
        ]
        return textlines, result['raw_mask'], None
