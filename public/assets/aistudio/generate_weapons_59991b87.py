#!/usr/bin/env python3
"""
Procedural Stylized RPG Weapon and Offhand Generator for Voxelfrpg
==================================================================
Generates high-detail MagicaVoxel (.vox v150) weapons, shields, and offhands
matching Voxelfrpg's vibrant chibi aesthetic, 16 voxels/unit scale, and socket attachments:

1. battleaxe.vox:
   - Double-bitted forged iron greataxe with brass bindings, notched steel blades, and ash handle.
   - Sockets: RightHand grip, stows diagonally on Torso back.

2. daggers.vox:
   - Curved rogue shadow-blade with wrapped hilt, brass pommel, and razor edge.
   - Sockets: RightHand quick-strike, stows on hip/torso.

3. iron_heater_shield.vox:
   - Heavy knight's heater shield with royal blue heraldic chevron, polished steel trim, and central brass boss.
   - Sockets: LeftHand brace, stows flat across Torso back.

4. spell_tome.vox:
   - Arcane sorcerer's offhand grimoire with gold-clasped leather binding and glowing aether cyan bookmark.
   - Sockets: LeftHand offhand grip, stows on Torso hip.
"""

import os
import struct
from pathlib import Path
from typing import Dict, List, Tuple


class ItemVoxBuilder:
    def __init__(self):
        self.voxels: Dict[Tuple[int, int, int], int] = {}
        self.palette: List[Tuple[int, int, int, int]] = [(0, 0, 0, 255)] * 256

    def set_color(self, index: int, r: int, g: int, b: int, a: int = 255):
        if 1 <= index <= 255:
            self.palette[index - 1] = (int(r), int(g), int(b), int(a))

    def set_voxel(self, x: int, y: int, z: int, color_index: int):
        if 1 <= color_index <= 255:
            self.voxels[(int(x), int(y), int(z))] = int(color_index)

    def fill_box(self, x0: int, x1: int, y0: int, y1: int, z0: int, z1: int, color_index: int):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for y in range(min(y0, y1), max(y0, y1) + 1):
                for z in range(min(z0, z1), max(z0, z1) + 1):
                    self.set_voxel(x, y, z, color_index)

    @staticmethod
    def _chunk(chunk_id: bytes, content: bytes, children: bytes = b"") -> bytes:
        return struct.pack("<4sii", chunk_id, len(content), len(children)) + content + children

    def save(self, filename: str):
        if not self.voxels:
            raise ValueError(f"No voxels in {filename}")

        xs = [x for x, y, z in self.voxels.keys()]
        ys = [y for x, y, z in self.voxels.keys()]
        zs = [z for x, y, z in self.voxels.keys()]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        min_z, max_z = min(zs), max(zs)

        sx = max_x - min_x + 1
        sy = max_y - min_y + 1
        sz = max_z - min_z + 1

        chunks: List[bytes] = []
        chunks.append(self._chunk(b"SIZE", struct.pack("<iii", sx, sy, sz)))

        xyzi_content = [struct.pack("<i", len(self.voxels))]
        for (gx, gy, gz), col in self.voxels.items():
            xyzi_content.append(struct.pack("<BBBB", gx - min_x, gy - min_y, gz - min_z, col))
        chunks.append(self._chunk(b"XYZI", b"".join(xyzi_content)))

        rgba_content = bytearray()
        for r, g, b, a in self.palette:
            rgba_content.extend(struct.pack("<BBBB", r, g, b, a))
        chunks.append(self._chunk(b"RGBA", bytes(rgba_content)))

        main_chunk = self._chunk(b"MAIN", b"", b"".join(chunks))
        Path(filename).parent.mkdir(parents=True, exist_ok=True)
        with open(filename, "wb") as f:
            f.write(struct.pack("<4si", b"VOX ", 150))
            f.write(main_chunk)
        print(f"Generated {filename} ({len(self.voxels)} voxels, size: {sx}x{sy}x{sz})")


# ==============================================================================
# 1. BATTLEAXE (Heavy Double-Bitted Greataxe)
# ==============================================================================
def generate_battleaxe(out_path: str):
    b = ItemVoxBuilder()

    # Palette
    b.set_color(1, 105, 68, 42)    # Ash wood shaft
    b.set_color(2, 68, 44, 26)     # Wood shadow / grain
    b.set_color(3, 215, 172, 68)   # Polished brass rings / collar
    b.set_color(4, 155, 118, 38)   # Brass shadow
    b.set_color(5, 205, 212, 222)  # Blade edge steel bright
    b.set_color(6, 142, 150, 162)  # Blade plate mid steel
    b.set_color(7, 85, 92, 102)    # Steel shadow / forged fuller
    b.set_color(8, 225, 65, 48)    # Crimson leather grip wraps
    b.set_color(9, 160, 38, 28)    # Leather shadow

    # Haft: 2x2 wooden shaft rising from z=0 to z=24 (grip center around z=7..11)
    b.fill_box(0, 1, 0, 1, 0, 24, 1)
    b.fill_box(0, 0, 0, 0, 0, 24, 2)
    # Brass pommel cap at z=0..1
    b.fill_box(-1, 2, -1, 2, 0, 1, 3)
    b.set_voxel(0, 0, -1, 4)
    # Crimson leather grip wraps at z=5..11
    for rz in range(5, 12):
        b.fill_box(-1, 2, 0, 1, rz, rz, 8 if rz % 2 == 0 else 9)
    # Upper brass collar below axe head at z=17..18
    b.fill_box(-1, 2, -1, 2, 17, 18, 3)
    # Top spear spike at z=24..27
    b.fill_box(0, 1, 0, 1, 24, 25, 6)
    b.set_voxel(0, 0, 26, 5)
    b.set_voxel(1, 1, 26, 5)
    b.set_voxel(0, 0, 27, 5)

    # Double-bitted axe head centered around z=19..23, extending across X=[-7..8]
    # Center heavy iron collar block
    b.fill_box(-2, 3, -1, 2, 19, 23, 7)
    # Left blade spreading X=[-7..-2]
    b.fill_box(-5, -2, 0, 1, 20, 22, 6)
    b.fill_box(-7, -5, 0, 1, 18, 24, 6)
    # Left razor cutting edge (beveled at X=-7..-8)
    b.fill_box(-8, -8, 0, 1, 17, 25, 5)
    b.set_voxel(-7, 0, 25, 5)
    b.set_voxel(-7, 0, 17, 5)

    # Right blade spreading X=[3..8]
    b.fill_box(3, 6, 0, 1, 20, 22, 6)
    b.fill_box(6, 8, 0, 1, 18, 24, 6)
    # Right razor cutting edge
    b.fill_box(9, 9, 0, 1, 17, 25, 5)
    b.set_voxel(8, 0, 25, 5)
    b.set_voxel(8, 0, 17, 5)

    # Center brass rune boss on both sides of axe head
    b.set_voxel(0, -2, 21, 3)
    b.set_voxel(1, -2, 21, 3)
    b.set_voxel(0, 3, 21, 3)
    b.set_voxel(1, 3, 21, 3)

    b.save(out_path)


# ==============================================================================
# 2. SHADOW DAGGER (Curved Rogue Assassin Blade)
# ==============================================================================
def generate_dagger(out_path: str):
    b = ItemVoxBuilder()

    # Palette
    b.set_color(1, 45, 38, 48)     # Shadow leather dark charcoal
    b.set_color(2, 28, 24, 32)     # Leather shadow
    b.set_color(3, 215, 175, 65)   # Gold / brass guard and pommel
    b.set_color(4, 155, 120, 35)   # Gold shadow
    b.set_color(5, 235, 242, 250)  # Polished silver razor blade
    b.set_color(6, 175, 185, 198)  # Blade mid
    b.set_color(7, 115, 125, 138)  # Blade spine dark
    b.set_color(8, 85, 230, 245)   # Glowing cyan poison / venom gem

    # Pommel at z=0..1
    b.fill_box(0, 1, 0, 1, 0, 1, 3)
    b.set_voxel(0, 0, -1, 8) # set cyan gem in pommel

    # Hilt grip at z=2..6
    b.fill_box(0, 1, 0, 1, 2, 6, 1)
    b.fill_box(0, 0, 0, 0, 2, 6, 2)
    b.set_voxel(1, 1, 4, 3) # brass grip ring

    # Curved Crossguard at z=7
    b.fill_box(-3, 4, 0, 1, 7, 7, 3)
    b.set_voxel(-3, 0, 8, 4) # curved guard tips
    b.set_voxel(4, 0, 8, 4)

    # Tapered Stiletto Blade at z=8..18
    for z in range(8, 19):
        # Taper blade width as z increases
        w = 1 if z >= 15 else 2
        b.fill_box(-w + 1, w, 0, 1, z, z, 6)
        b.set_voxel(0, 0, z, 7) # central blood fuller
        # Razor edge highlights
        b.set_voxel(-w + 1, 0, z, 5)
        b.set_voxel(w, 0, z, 5)
    # Piercing point tip at z=19
    b.set_voxel(0, 0, 19, 5)
    b.set_voxel(1, 0, 19, 5)

    b.save(out_path)


# ==============================================================================
# 3. HEATER SHIELD (Knight's Heraldic Shield)
# ==============================================================================
def generate_heater_shield(out_path: str):
    b = ItemVoxBuilder()

    # Palette
    b.set_color(1, 48, 88, 185)    # Heraldic royal blue field
    b.set_color(2, 28, 55, 125)    # Deep blue shadow
    b.set_color(3, 235, 240, 248)  # Polished silver chevron / trim
    b.set_color(4, 168, 178, 192)  # Silver trim shadow
    b.set_color(5, 225, 182, 55)   # Gold / bronze rim and boss
    b.set_color(6, 165, 128, 32)   # Bronze shadow
    b.set_color(7, 85, 55, 35)     # Dark wood / leather shield back
    b.set_color(8, 55, 35, 22)     # Arm strap leather

    # Shield curved plate across X=[-6..6], Y=[0..2], Z=[0..18]
    # Tapering V-shape downward from Z=18 down to point at Z=0
    for z in range(19):
        if z <= 2:
            half_w = 1
        elif z <= 5:
            half_w = 2
        elif z <= 8:
            half_w = 3
        elif z <= 12:
            half_w = 4
        elif z <= 15:
            half_w = 5
        else:
            half_w = 6

        # Outer bronze rim
        b.fill_box(-half_w, half_w, 0, 0, z, z, 5)
        # Inner shield body
        if half_w > 1:
            b.fill_box(-half_w + 1, half_w - 1, 0, 0, z, z, 1)
            # Wood backing
            b.fill_box(-half_w + 1, half_w - 1, 1, 1, z, z, 7)

    # Silver chevron pattern on face: V-shape across mid-shield
    for x in range(-4, 5):
        cz = 12 - abs(x)
        b.set_voxel(x, -1, cz, 3)
        b.set_voxel(x, -1, cz + 1, 3)

    # Polished bronze center shield boss at X=[-1..1], Z=[10..12], Y=-1
    b.fill_box(-1, 1, -1, -1, 10, 12, 5)
    b.set_voxel(0, -2, 11, 5) # protruding boss spike

    # Arm straps on back at Y=2
    b.fill_box(-2, 2, 2, 2, 12, 12, 8)
    b.fill_box(-2, 2, 2, 2, 7, 7, 8)

    b.save(out_path)


# ==============================================================================
# 4. SPELL TOME (Arcane Offhand Grimoire)
# ==============================================================================
def generate_spell_tome(out_path: str):
    b = ItemVoxBuilder()

    # Palette
    b.set_color(1, 118, 35, 42)    # Tome cover crimson leather
    b.set_color(2, 78, 22, 28)     # Cover crease shadow
    b.set_color(3, 242, 235, 215)  # Parchment pages ivory
    b.set_color(4, 195, 185, 165)  # Parchment edge shadow
    b.set_color(5, 225, 185, 58)   # Gold cover trim and clasp
    b.set_color(6, 165, 128, 32)   # Gold shadow
    b.set_color(7, 55, 220, 245)   # Aether glowing cyan ribbon bookmark
    b.set_color(8, 215, 255, 255)  # Cyan ribbon gleam

    # Book dimensions: X=[-5..5], Y=[-2..2], Z=[0..14]
    # Spine at X=-5, pages open toward X=5
    # Front cover at Y=-2, back cover at Y=2
    b.fill_box(-5, 5, -2, -2, 0, 14, 1) # front cover
    b.fill_box(-5, 5, 2, 2, 0, 14, 1)   # back cover
    b.fill_box(-5, -5, -2, 2, 0, 14, 1) # spine

    # Gold corner protectors on covers
    for y_cover in (-2, 2):
        for z_corner in (0, 14):
            b.fill_box(3, 5, y_cover, y_cover, z_corner, z_corner, 5)
            b.fill_box(-5, -4, y_cover, y_cover, z_corner, z_corner, 5)

    # Gold center arcane rune symbol on front cover (Y=-2)
    b.fill_box(-1, 1, -2, -2, 6, 8, 5)
    b.set_voxel(0, -3, 7, 7) # glowing cyan aether jewel set in cover rune

    # Thick ivory parchment pages inside X=[-4..4], Y=[-1..1], Z=[1..13]
    b.fill_box(-4, 4, -1, 1, 1, 13, 3)
    b.fill_box(4, 4, -1, 1, 1, 13, 4) # page edges

    # Gold clasp on side at X=5, Z=[6..8]
    b.fill_box(5, 5, -1, 1, 6, 8, 5)

    # Glowing cyan ribbon bookmark trailing out the bottom at Z=[-3..0], X=0
    b.fill_box(0, 0, 0, 0, -2, 0, 7)
    b.set_voxel(1, 0, -3, 8)
    b.set_voxel(0, 0, -3, 7)

    b.save(out_path)


def main():
    root = Path(__file__).resolve().parents[1]
    weapons_dir = root / "Assets" / "models" / "items" / "weapons"
    shields_dir = root / "Assets" / "models" / "items" / "shields"

    print("Generating new stylized weapons and offhands...")
    generate_battleaxe(str(weapons_dir / "battleaxe.vox"))
    generate_dagger(str(weapons_dir / "shadow_dagger.vox"))
    generate_heater_shield(str(shields_dir / "heater_shield.vox"))
    generate_spell_tome(str(shields_dir / "spell_tome.vox"))
    print("Done generating weapons and offhands!")


if __name__ == "__main__":
    main()
