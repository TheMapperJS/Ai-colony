"""Rebuild scale-one melee assets and transparent inventory icons (16 voxels/unit)."""
from pathlib import Path
import struct
import zlib
from generate_weapons import ItemVoxBuilder

ROOT = Path(__file__).resolve().parents[1]


def builder():
    b = ItemVoxBuilder()
    for i, rgb in enumerate([(91, 52, 35), (153, 77, 44), (220, 172, 66),
                             (83, 99, 118), (153, 176, 192), (226, 239, 244),
                             (75, 87, 82), (132, 151, 137)], 1):
        b.set_color(i, *rgb)
    return b


def save(b, name):
    b.save(str(ROOT / f'Assets/models/items/weapons/{name}.vox'))
    # Orthographic inventory silhouette. Highest visible depth wins.
    xs, _, zs = zip(*b.voxels)
    pixels = bytearray(64 * 64 * 4)
    scale = min(56 // (max(xs)-min(xs)+1), 56 // (max(zs)-min(zs)+1))
    width = (max(xs)-min(xs)+1)*scale
    height = (max(zs)-min(zs)+1)*scale
    for (x, y, z), c in sorted(b.voxels.items(), key=lambda v: -v[0][1]):
        color = bytes(b.palette[c-1])
        for dx in range(scale):
            for dz in range(scale):
                px = (64-width)//2 + (x-min(xs))*scale+dx
                py = (64-height)//2 + (max(zs)-z)*scale+dz
                offset = (py*64+px)*4
                pixels[offset:offset+4] = color
    def png_chunk(tag, data):
        return struct.pack('>I', len(data))+tag+data+struct.pack('>I', zlib.crc32(tag+data))
    rows = b''.join(b'\0'+pixels[y*256:(y+1)*256] for y in range(64))
    png = b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', struct.pack('>IIBBBBB',64,64,8,6,0,0,0))
    png += png_chunk(b'IDAT', zlib.compress(rows))+png_chunk(b'IEND', b'')
    (ROOT / f'Assets/icons/weapons/{name}.png').write_bytes(png)


def generate():
    b = builder()
    b.fill_box(-1, 0, 0, 1, 0, 1, 3)
    for z in range(2, 7):
        b.fill_box(-1, 0, 0, 1, z, z, 1 if z % 2 else 2)
    b.fill_box(-4, 3, 0, 1, 7, 8, 3)
    for z in range(9, 24):
        lo, hi = (-2, 1) if z < 21 else (-1, 0)
        b.fill_box(lo, hi, 0, 1, z, z, 5)
        b.fill_box(lo, lo, 0, 1, z, z, 6)
        b.fill_box(hi, hi, 0, 1, z, z, 6)
        if z < 21:
            b.set_voxel(-1, 0, z, 4)
    b.fill_box(-1, 0, 0, 0, 24, 24, 6)
    save(b, 'iron_arming_sword')

    b = builder()
    b.fill_box(-1, 0, 0, 1, 0, 16, 1)
    for z in range(1, 7):
        b.fill_box(-1, 0, 0, 1, z, z, 2 if z % 2 else 1)
    b.fill_box(-2, 1, -1, 2, 11, 15, 4)
    b.fill_box(2, 4, 0, 1, 12, 15, 5)
    b.fill_box(5, 6, 0, 1, 10, 17, 5)
    b.fill_box(7, 7, 0, 1, 10, 17, 6)
    b.fill_box(-1, 0, -1, 2, 9, 10, 3)
    save(b, 'raider_hatchet')

    b = builder()
    b.fill_box(-1, 0, 0, 1, 0, 17, 1)
    for z in range(1, 8):
        b.fill_box(-1, 0, 0, 1, z, z, 2 if z % 2 else 1)
    b.fill_box(-2, 1, -1, 2, 10, 11, 3)
    b.fill_box(-5, 4, -2, 3, 14, 20, 7)
    b.fill_box(-4, 3, -2, 3, 15, 19, 8)
    b.fill_box(-1, 0, -3, 4, 14, 20, 3)
    b.fill_box(-5, -5, -1, 2, 15, 19, 8)
    b.fill_box(4, 4, -1, 2, 15, 19, 8)
    save(b, 'stone_warhammer')

    # Long ash shaft, wrapped central grip, socketed leaf-shaped steel point.
    b = builder()
    b.fill_box(-1, 0, 0, 1, 0, 29, 1)
    b.fill_box(-1, 0, 0, 1, 0, 1, 4)
    for z in range(11, 19):
        b.fill_box(-1, 0, 0, 1, z, z, 2 if z % 2 else 1)
    b.fill_box(-2, 1, -1, 2, 27, 29, 3)
    for z in range(30, 40):
        lo, hi = (-3, 2) if z < 34 else (-2, 1) if z < 37 else (-1, 0)
        b.fill_box(lo, hi, 0, 1, z, z, 5)
        b.fill_box(lo, lo, 0, 1, z, z, 6)
        b.fill_box(hi, hi, 0, 1, z, z, 6)
        b.set_voxel(-1, 0, z, 4)
    b.set_voxel(-1, 0, 40, 6)
    save(b, 'ash_spear')

    # Poleaxe silhouette: broad forward blade, rear hook, and piercing top spike.
    b = builder()
    b.fill_box(-1, 0, 0, 1, 0, 32, 1)
    b.fill_box(-1, 0, 0, 1, 0, 1, 4)
    for z in range(11, 20):
        b.fill_box(-1, 0, 0, 1, z, z, 2 if z % 2 else 1)
    b.fill_box(-2, 1, -1, 2, 26, 32, 4)
    b.fill_box(-2, 1, -1, 2, 24, 25, 3)
    b.fill_box(2, 4, 0, 1, 28, 32, 5)
    b.fill_box(5, 6, 0, 1, 26, 34, 5)
    b.fill_box(7, 7, 0, 1, 25, 35, 6)
    b.fill_box(-5, -3, 0, 1, 30, 31, 5)
    b.fill_box(-5, -5, 0, 1, 28, 29, 6)
    b.fill_box(-1, 0, 0, 1, 33, 39, 5)
    b.fill_box(-1, 0, 0, 0, 40, 41, 6)
    b.set_voxel(-1, 0, 42, 6)
    save(b, 'iron_halberd')


if __name__ == '__main__':
    generate()
