import os
import shutil
from typing import List

import cv2
import numpy as np

from .common import OfflineDetector
from ..utils import Quadrilateral


class YSGYoloDetector(OfflineDetector):
    _MODEL_MAPPING = {
        "model": {
            "url": "https://huggingface.co/YSGforMTL/YSGYoloDetector/resolve/main/ysgyolo_1.2_OS1.0.pt",
            "file": "ysgyolo_1.2_OS1.0.pt",
        }
    }

    def __init__(self, *args, **kwargs):
        self._weights_override = os.getenv("MT_YSGYOLO_WEIGHTS", "").strip()
        if self._weights_override:
            self._weights_override = os.path.abspath(
                os.path.expanduser(self._weights_override)
            )
        os.makedirs(self.model_dir, exist_ok=True)
        if os.path.exists("ysgyolo_1.2_OS1.0.pt"):
            shutil.move(
                "ysgyolo_1.2_OS1.0.pt",
                self._get_file_path("ysgyolo_1.2_OS1.0.pt"),
            )
        super().__init__(*args, **kwargs)

    async def _load(self, device: str):
        try:
            from ultralytics import YOLO
        except Exception as exc:
            raise ImportError(
                "YSGYoloDetector requires ultralytics. Install it with: pip install ultralytics"
            ) from exc

        if self._weights_override:
            weights_path = self._weights_override
        else:
            weights_path = self._get_file_path("ysgyolo_1.2_OS1.0.pt")
        if not os.path.exists(weights_path):
            raise FileNotFoundError(f"YSGYolo weights not found: {weights_path}")

        self.model = YOLO(weights_path)
        self.device = device
        if device == "cuda":
            self._ultralytics_device = 0
        else:
            self._ultralytics_device = device

    async def _unload(self):
        del self.model

    async def _infer(
        self,
        image: np.ndarray,
        detect_size: int,
        text_threshold: float,
        box_threshold: float,
        unclip_ratio: float,
        verbose: bool = False,
    ):
        image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        results = self.model.predict(
            source=image_bgr,
            imgsz=int(detect_size),
            conf=float(text_threshold),
            iou=float(box_threshold),
            device=self._ultralytics_device,
            verbose=False,
        )

        result = results[0] if results else None
        h, w = image.shape[:2]
        raw_mask = np.zeros((h, w), dtype=np.uint8)
        textlines: List[Quadrilateral] = []

        if not result or result.boxes is None or len(result.boxes) == 0:
            return textlines, raw_mask, None

        boxes = result.boxes
        xyxy = boxes.xyxy.detach().cpu().numpy()
        confs = boxes.conf.detach().cpu().numpy()

        for (x1, y1, x2, y2), score in zip(xyxy, confs):
            x1 = int(max(0, min(w - 1, round(x1))))
            y1 = int(max(0, min(h - 1, round(y1))))
            x2 = int(max(0, min(w - 1, round(x2))))
            y2 = int(max(0, min(h - 1, round(y2))))
            if x2 <= x1 or y2 <= y1:
                continue
            cv2.rectangle(raw_mask, (x1, y1), (x2, y2), 255, -1)
            pts = np.array(
                [[x1, y1], [x2, y1], [x2, y2], [x1, y2]],
                dtype=np.int64,
            )
            textlines.append(Quadrilateral(pts, "", float(score)))

        return textlines, raw_mask, None
