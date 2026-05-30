import io
import pickle
import sys

import numpy as np
from PIL import Image
import rusty_manga_image_translator as r


def main():
    payload = sys.stdin.buffer.read()
    if not payload:
        raise RuntimeError("No input payload received")

    data = pickle.loads(payload)
    image_bytes = data["image_bytes"]
    options = data["options"]

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    arr = np.array(img)

    session = r.Session(None)
    detector = session.paddle_detector()
    detector.load()

    pre = r.PyPreprocessorOptions(
        options["invert"],
        options["gamma_correct"],
        options["rotate"],
        options["auto_rotate"],
    )
    defaults = r.PyDefaultOptions(
        options["detect_size"],
        options["unclip_ratio"],
        options["text_threshold"],
        options["box_threshold"],
    )
    py_img = r.PyImage.from_numpy(arr)
    areas, raw_mask = detector.detect(py_img, pre, defaults)

    result = {
        "areas": [(area.pts(), area.score()) for area in areas],
        "raw_mask": raw_mask,
    }
    sys.stdout.buffer.write(pickle.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        sys.stderr.write(f"{exc}\n")
        sys.exit(1)
