import os
from PIL import Image

def main():
    uploads_dir = '/Users/apple/Documents/freeLancing projects/zplusenews/BizzShort/uploads'
    if not os.path.exists(uploads_dir):
        print(f"Directory not found: {uploads_dir}")
        return

    files = [f for f in os.listdir(uploads_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'))]
    print(f"Scanning {len(files)} uploaded images using Pillow...")

    smaller_than_1200 = 0
    larger_or_equal_1200 = 0
    unknown = 0
    total = len(files)

    smaller_details = []

    for name in files:
        path = os.path.join(uploads_dir, name)
        try:
            with Image.open(path) as img:
                w, h = img.size
                if w < 1200:
                    smaller_than_1200 += 1
                    smaller_details.append((name, w, h))
                else:
                    larger_or_equal_1200 += 1
        except Exception as e:
            unknown += 1

    print("\n--- Image Dimension Audit ---")
    print(f"Total Images Found: {total}")
    print(f"Discover Ready (Width >= 1200px): {larger_or_equal_1200} ({(larger_or_equal_1200/total*100):.1f}%)")
    print(f"Sub-optimal (Width < 1200px):   {smaller_than_1200} ({(smaller_than_1200/total*100):.1f}%)")
    print(f"Failed to Read:                   {unknown}")

    if smaller_details:
        print(f"\nSub-optimal images list ({len(smaller_details)} total):")
        for name, w, h in sorted(smaller_details, key=lambda x: x[1]):
            print(f" - {name}: {w}x{h}px")

if __name__ == '__main__':
    main()
