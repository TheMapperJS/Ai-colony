#!/usr/bin/env python3
"""
Procedural Stylized RPG Enemy Generator for Voxelfrpg (Chibi Aesthetic)
========================================================================
Generates multi-part MagicaVoxel (.vox v150) enemy rigs matching the exact
chibi/stylized art style, volume layering, and palette shading of characters.py:
- goblin.vox:          Hunched Chibi Goblin (6 parts: head, torso, right_hand, left_hand, right_foot, left_foot)
                       with bat-ears, snout, fangs, ragged stitched tunic, spiked pauldron,
                       crude notched cleaver, and studded wooden buckler.
- skeleton_warrior.vox: Chibi Skeleton Legionnaire (17 parts: skull, helmet, plume, ribcage, soul_orb,
                       breastplate, tabard, belt, pelvis, pauldron_L, pauldron_R, hand_L, shield,
                       hand_R, sword, boot_L, boot_R) with recessed eye sockets, glowing cyan eyes,
                       bronze crested helmet with plume, broadsword, and round shield.
- skeleton_mage.vox:   Chibi Void Lich (16 parts: skull, hat, ribcage, soul_orb, tabard, belt, pelvis,
                       shoulder_L, shoulder_R, hand_L, staff, staff_orb, hand_R, spell_flame,
                       shoe_L, shoe_R) with deep shadowy cowl, glowing purple eyes, gold-trimmed
                       sorcerer mantle, skull staff, and purple spell flame.
- slime.vox:           Forest Chibi Slime (3 parts: Slime_Body, Slime_Core, Slime_Face)
                       with bouncy droplet shape, inner glowing core, and anime eyes.
- slime_aether.vox:    Aether Chibi Slime (3 parts: Slime_Body, Slime_Core, Slime_Face)
                       with glowing cyan crystal jelly and aether spark core.
- orc_brute.vox:       Chibi Savage Orc Brute (10 parts: head, torso, belt, pelvis, pauldron_L, pauldron_R,
                       hand_L, hand_R, weapon, boot_L, boot_R -> 11 parts) with horned war-helm,
                       protruding tusks, spiked iron pauldrons, and double-bitted greataxe.
- forest_spider.vox:   Chibi Forest Venom Spider (7 parts: head, torso, stinger, left_hand, right_hand,
                       left_foot, right_foot) with cluster of 6 glowing emerald eyes, venomous fangs,
                       bulbous patterned abdomen, and articulated chitinous legs.
- stone_golem.vox:     Chibi Ancient Aether Stone Golem (10 parts: head, torso, soul_orb, pelvis,
                       pauldron_L, pauldron_R, hand_L, hand_R, boot_L, boot_R) with moss-grown basalt
                       slabs, floating cyan aether crystal heart, and massive rune-etched fists.
"""

import os
import struct
from pathlib import Path
from typing import Dict, List, Tuple


class EnemyVoxBuilder:
    def __init__(self, part_names: List[str]):
        self.part_names = part_names
        self.parts: Dict[str, Dict[Tuple[int, int, int], int]] = {name: {} for name in part_names}
        self.palette: List[Tuple[int, int, int, int]] = [(0, 0, 0, 255)] * 256

    def set_color(self, index: int, r: int, g: int, b: int, a: int = 255):
        if 1 <= index <= 255:
            self.palette[index - 1] = (int(r), int(g), int(b), int(a))

    def set_voxel(self, part: str, x: int, y: int, z: int, color_index: int):
        if 1 <= color_index <= 255 and part in self.parts:
            self.parts[part][(int(x), int(y), int(z))] = int(color_index)

    def remove_voxel(self, part: str, x: int, y: int, z: int):
        if part in self.parts:
            self.parts[part].pop((int(x), int(y), int(z)), None)

    def fill_box(self, part: str, x0: int, x1: int, y0: int, y1: int, z0: int, z1: int, color_index: int):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for y in range(min(y0, y1), max(y0, y1) + 1):
                for z in range(min(z0, z1), max(z0, z1) + 1):
                    self.set_voxel(part, x, y, z, color_index)

    @staticmethod
    def _chunk(chunk_id: bytes, content: bytes, children: bytes = b"") -> bytes:
        return struct.pack("<4sii", chunk_id, len(content), len(children)) + content + children

    @staticmethod
    def _dict_bytes(mapping: Dict[str, str]) -> bytes:
        out = [struct.pack("<i", len(mapping))]
        for k, v in mapping.items():
            kb = k.encode("utf-8")
            vb = v.encode("utf-8")
            out.append(struct.pack("<i", len(kb)) + kb + struct.pack("<i", len(vb)) + vb)
        return b"".join(out)

    def save(self, filename: str):
        chunks: List[bytes] = []

        model_names = [p for p in self.part_names if len(self.parts[p]) > 0]
        model_indices: Dict[str, int] = {}
        model_bounds: Dict[str, Tuple[int, int, int, int, int, int]] = {}

        for idx, name in enumerate(model_names):
            model_indices[name] = idx
            voxels = self.parts[name]
            xs = [x for x, y, z in voxels.keys()]
            ys = [y for x, y, z in voxels.keys()]
            zs = [z for x, y, z in voxels.keys()]
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)
            min_z, max_z = min(zs), max(zs)
            model_bounds[name] = (min_x, max_x, min_y, max_y, min_z, max_z)

            sx = max_x - min_x + 1
            sy = max_y - min_y + 1
            sz = max_z - min_z + 1

            size_content = struct.pack("<iii", sx, sy, sz)
            chunks.append(self._chunk(b"SIZE", size_content))

            xyzi_content = [struct.pack("<i", len(voxels))]
            for (gx, gy, gz), col in voxels.items():
                lx = gx - min_x
                ly = gy - min_y
                lz = gz - min_z
                xyzi_content.append(struct.pack("<BBBB", lx, ly, lz, col))
            chunks.append(self._chunk(b"XYZI", b"".join(xyzi_content)))

        next_id = 0
        root_trn_id = next_id; next_id += 1
        root_grp_id = next_id; next_id += 1

        part_trn_ids: List[int] = []
        part_shp_ids: List[int] = []
        for _ in model_names:
            part_trn_ids.append(next_id); next_id += 1
            part_shp_ids.append(next_id); next_id += 1

        root_trn_content = (
            struct.pack("<i", root_trn_id)
            + self._dict_bytes({"_name": "scene"})
            + struct.pack("<iiii", root_grp_id, -1, 0, 1)
            + self._dict_bytes({})
        )
        chunks.append(self._chunk(b"nTRN", root_trn_content))

        grp_content = (
            struct.pack("<i", root_grp_id)
            + self._dict_bytes({})
            + struct.pack("<i", len(part_trn_ids))
            + struct.pack(f"<{len(part_trn_ids)}i", *part_trn_ids)
        )
        chunks.append(self._chunk(b"nGRP", grp_content))

        for idx, name in enumerate(model_names):
            trn_id = part_trn_ids[idx]
            shp_id = part_shp_ids[idx]
            mid = model_indices[name]

            min_x, max_x, min_y, max_y, min_z, max_z = model_bounds[name]
            tx = (min_x + max_x + 1) // 2
            ty = (min_y + max_y + 1) // 2
            tz = (min_z + max_z + 1) // 2

            trn_content = (
                struct.pack("<i", trn_id)
                + self._dict_bytes({"_name": name})
                + struct.pack("<iiii", shp_id, -1, 0, 1)
                + self._dict_bytes({"_t": f"{tx} {ty} {tz}"})
            )
            chunks.append(self._chunk(b"nTRN", trn_content))

            shp_content = (
                struct.pack("<i", shp_id)
                + self._dict_bytes({})
                + struct.pack("<i", 1)
                + struct.pack("<i", mid)
                + self._dict_bytes({})
            )
            chunks.append(self._chunk(b"nSHP", shp_content))

        rgba_content = bytearray()
        for r, g, b, a in self.palette:
            rgba_content.extend(struct.pack("<BBBB", r, g, b, a))
        chunks.append(self._chunk(b"RGBA", bytes(rgba_content)))

        main_chunk = self._chunk(b"MAIN", b"", b"".join(chunks))
        Path(filename).parent.mkdir(parents=True, exist_ok=True)
        with open(filename, "wb") as f:
            f.write(struct.pack("<4si", b"VOX ", 150))
            f.write(main_chunk)
        print(f"Generated {filename} ({len(model_names)} parts, {sum(len(self.parts[p]) for p in model_names)} voxels)")


# ==============================================================================
# 1. GOBLIN (Chibi Scrapper - 6 Parts)
# ==============================================================================
def generate_goblin(out_path: str):
    """
    Sculpted Chibi Goblin:
    - 6 standard parts (head, torso, right_hand, left_hand, right_foot, left_foot)
    - Expressive face with recessed eye sockets, glowing amber irises, fangs, long pointed bat-ears
    - Ragged stitched vest, rope belt, notched cleaver attached to right hand, studded buckler on left hand
    """
    parts = [
        "head",
        "torso",
        "right_hand",
        "left_hand",
        "right_foot",
        "left_foot",
    ]
    b = EnemyVoxBuilder(parts)

    # Palette
    b.set_color(1, 108, 162, 54)   # Skin light
    b.set_color(2, 78, 126, 40)    # Skin mid / shadows
    b.set_color(3, 52, 90, 28)     # Skin dark / creases
    b.set_color(4, 155, 198, 88)   # Skin highlight / nose & ear tips
    b.set_color(5, 255, 215, 40)   # Eye bright amber
    b.set_color(6, 195, 135, 20)   # Eye amber shade
    b.set_color(7, 40, 25, 15)     # Eye slit / mouth dark
    b.set_color(8, 250, 245, 230)  # White catchlight / fangs
    b.set_color(9, 135, 60, 48)    # Red bandana / cap bright
    b.set_color(10, 95, 40, 32)    # Red cap shade
    b.set_color(11, 235, 190, 55)  # Brass earring & rivets
    b.set_color(12, 105, 78, 48)   # Tunic leather mid
    b.set_color(13, 72, 52, 32)    # Tunic leather dark
    b.set_color(14, 175, 142, 98)  # Rope belt & stitches
    b.set_color(15, 125, 95, 60)   # Wrist & foot wraps
    b.set_color(16, 170, 180, 190) # Iron cleaver blade bright
    b.set_color(17, 105, 115, 125) # Iron blade dark
    b.set_color(18, 55, 60, 68)    # Blade notch / rust

    # 1. torso (x=[-4..4], y=[-3..2], z=[4..12]) + shoulders
    b.fill_box("torso", -3, 3, -2, 2, 4, 12, 12)
    b.fill_box("torso", -4, 4, -3, -3, 5, 12, 13) # ragged vest front
    # Chest stitch cross
    b.set_voxel("torso", 0, -4, 9, 14)
    b.set_voxel("torso", -1, -4, 9, 14)
    b.set_voxel("torso", 1, -4, 9, 14)
    b.set_voxel("torso", 0, -4, 10, 14)
    b.set_voxel("torso", 0, -4, 8, 14)
    # Rope belt at z=6..7 with bone pouch
    b.fill_box("torso", -4, 4, -3, 2, 6, 7, 14)
    b.fill_box("torso", -2, -1, -4, -3, 5, 7, 13) # leather pouch
    # Spiked iron shoulder guard (right)
    b.fill_box("torso", -7, -5, -3, 3, 10, 12, 17)
    b.fill_box("torso", -6, -5, -2, 2, 13, 13, 16)
    b.set_voxel("torso", -6, 0, 14, 16)
    # Leather shoulder guard (left)
    b.fill_box("torso", 5, 7, -3, 2, 10, 12, 12)
    b.set_voxel("torso", 6, -1, 13, 14)

    # 2. Feet (right_foot x=[2..5], left_foot x=[-5..-2], z=[0..3])
    for part, x0, x1 in (("right_foot", 2, 5), ("left_foot", -5, -2)):
        b.fill_box(part, x0, x1, -3, 2, 0, 1, 15) # wrap sole
        b.fill_box(part, x0, x1, -2, 2, 2, 3, 2)  # green shin
        # Goblin claw toes at front
        for tx in range(x0, x1 + 1):
            if tx % 2 == 0:
                b.set_voxel(part, tx, -4, 0, 4)

    # 3. Hands & Arms
    # left_hand (claws + studded buckler)
    b.fill_box("left_hand", 6, 8, -2, 1, 4, 7, 1)
    b.fill_box("left_hand", 6, 8, -2, 0, 3, 3, 15) # wrist wrap
    # Small wooden round buckler on left forearm (x=9, y=[-2..2], z=[3..7])
    b.fill_box("left_hand", 9, 9, -2, 2, 3, 7, 12)
    b.set_voxel("left_hand", 10, 0, 5, 11) # brass boss center
    b.set_voxel("left_hand", 9, -2, 3, 11) # corner studs
    b.set_voxel("left_hand", 9, 2, 3, 11)
    b.set_voxel("left_hand", 9, -2, 7, 11)
    b.set_voxel("left_hand", 9, 2, 7, 11)

    # right_hand with Crude Cleaver
    b.fill_box("right_hand", -8, -6, -2, 1, 4, 7, 1)
    b.fill_box("right_hand", -8, -6, -2, 0, 3, 3, 15)
    # Cleaver hilt wrapped in leather
    b.fill_box("right_hand", -7, -7, -4, -1, 4, 5, 15)
    # Broad notched iron blade extending forward (y=[-10..-4], z=[3..8])
    b.fill_box("right_hand", -7, -7, -9, -4, 4, 7, 16)
    b.fill_box("right_hand", -7, -7, -8, -5, 8, 8, 17) # spine
    b.set_voxel("right_hand", -7, -7, 4, 18)
    b.set_voxel("right_hand", -7, -5, 4, 18)
    b.set_voxel("right_hand", -7, -10, 6, 16) # tip

    # 4. head (Core head x=[-5..5], y=[-4..4], z=[13..23])
    # Skull block
    b.fill_box("head", -4, 4, -4, 4, 13, 20, 1)
    b.fill_box("head", -5, 5, -3, 3, 14, 19, 2) # cheek width
    # Goblin snout / nose sticking out at y=-5
    b.fill_box("head", -1, 1, -5, -5, 15, 16, 4)
    b.set_voxel("head", 0, -6, 15, 4) # tip of pointy nose

    # Recessed eye sockets & glowing amber eyes at y=-4, z=16..17
    for sx in (-1, 1):
        ex = sx * 3
        b.fill_box("head", ex - 1, ex + 1, -4, -3, 16, 17, 3)
        b.set_voxel("head", ex, -4, 16, 5) # bright
        b.set_voxel("head", ex, -4, 17, 6) # shade
        b.set_voxel("head", ex, -5, 16, 7) # slit pupil
        b.set_voxel("head", ex + sx, -4, 17, 8) # white gleam
        b.fill_box("head", ex - 1, ex + 1, -5, -4, 18, 18, 3) # brow

    # Mouth & sharp protruding tusks/fangs at y=-5, z=13..14
    b.fill_box("head", -2, 2, -5, -4, 13, 13, 7)
    b.set_voxel("head", -2, -5, 14, 8)
    b.set_voxel("head", 2, -5, 14, 8)

    # Bat Ears
    for sx in (-1, 1):
        for i in range(5):
            ex = (5 + i) * sx
            ey = -1 + (i * 3) // 4
            ez = 16 + (i // 2)
            b.fill_box("head", ex, ex, ey, ey + 1, ez - 1, ez + 1, 1 if i < 3 else 4)
            b.set_voxel("head", ex, ey, ez, 2)
        if sx > 0:
            b.fill_box("head", 8, 9, 2, 2, 16, 17, 11) # brass earring

    # Red Bandana / Skullcap on top of head (z=20..22, y=[-4..4])
    b.fill_box("head", -5, 5, -4, 4, 20, 21, 9)
    b.fill_box("head", -4, 4, -3, 3, 22, 22, 10)
    b.fill_box("head", -1, 1, 5, 6, 19, 20, 9)
    b.set_voxel("head", 0, 7, 18, 10)

    b.save(out_path)


# ==============================================================================
# 2. SKELETON WARRIOR (Chibi Legionnaire - 17 Parts)
# ==============================================================================
def generate_skeleton_warrior(out_path: str):
    """
    Sculpted Chibi Skeleton Warrior:
    - 17 distinct parts matching engine tests and skeletal rig:
      [sword, hand_L, shield, hand_R, plume, helmet, skull, pauldron_L, pauldron_R,
       soul_orb, breastplate, ribcage, tabard, belt, pelvis, boot_L, boot_R]
    - Expressive rounded skull, hollow sockets with glowing aether cyan pupils
    - Centurion helmet with curved bronze crest, cheek guards, and crimson plume
    - Weathered iron broadsword, bronze round shield, open ribcage over soul orb
    """
    parts = [
        "sword",
        "hand_L",
        "shield",
        "hand_R",
        "plume",
        "helmet",
        "skull",
        "pauldron_L",
        "pauldron_R",
        "soul_orb",
        "breastplate",
        "ribcage",
        "tabard",
        "belt",
        "pelvis",
        "boot_L",
        "boot_R",
    ]
    b = EnemyVoxBuilder(parts)

    # Palette
    b.set_color(1, 242, 238, 224)  # Bone bright
    b.set_color(2, 205, 198, 182)  # Bone mid
    b.set_color(3, 158, 150, 134)  # Bone shadow
    b.set_color(4, 38, 34, 42)     # Deep cavity / socket shadow
    b.set_color(5, 210, 255, 255)  # Aether cyan bright (core)
    b.set_color(6, 45, 220, 245)   # Aether cyan glow
    b.set_color(7, 16, 125, 190)   # Aether cyan deep
    b.set_color(8, 186, 142, 58)   # Ancient bronze bright
    b.set_color(9, 138, 102, 38)   # Bronze mid
    b.set_color(10, 88, 62, 24)    # Bronze dark
    b.set_color(11, 215, 52, 44)   # Crimson plume bright
    b.set_color(12, 155, 32, 28)   # Plume dark
    b.set_color(13, 195, 202, 212) # Steel blade bright
    b.set_color(14, 135, 142, 152) # Steel blade mid
    b.set_color(15, 82, 88, 98)    # Steel blade dark / rust
    b.set_color(16, 72, 52, 36)    # Leather wraps

    # 1. ribcage: Spine + Ribs (z=[6..12])
    b.fill_box("ribcage", -1, 1, -1, 1, 6, 12, 4)
    b.fill_box("ribcage", 0, 0, -1, 1, 6, 12, 2)
    for rz in (7, 9, 11):
        b.fill_box("ribcage", -3, 3, -3, -3, rz, rz, 1)
        b.fill_box("ribcage", -4, -4, -2, 1, rz, rz, 2)
        b.fill_box("ribcage", 4, 4, -2, 1, rz, rz, 2)

    # 2. soul_orb: Glowing aether core inside ribcage
    b.fill_box("soul_orb", -1, 1, -2, 0, 8, 10, 6)
    b.set_voxel("soul_orb", 0, -1, 9, 5)

    # 3. breastplate: Bronze armor plate over chest
    b.fill_box("breastplate", -3, 3, -4, -4, 9, 11, 8)
    b.set_voxel("breastplate", 0, -4, 10, 9)

    # 4. pelvis, belt, tabard (z=[3..5])
    b.fill_box("pelvis", -3, 3, -2, 1, 4, 5, 2)
    b.fill_box("belt", -4, 4, -3, 2, 5, 5, 9)
    b.fill_box("tabard", -1, 1, -4, -3, 3, 5, 11)

    # 5. boot_L, boot_R (z=[0..3])
    for part, x0, x1 in (("boot_R", 2, 5), ("boot_L", -5, -2)):
        cx = (x0 + x1) // 2
        b.fill_box(part, cx - 1, cx, -1, 0, 1, 3, 1)
        b.fill_box(part, cx - 1, cx, 1, 1, 1, 3, 2)
        b.fill_box(part, cx - 1, cx + 1, -3, 1, 0, 0, 1)
        b.set_voxel(part, cx - 1, -4, 0, 1)
        b.set_voxel(part, cx + 1, -4, 0, 1)

    # 6. pauldron_L, pauldron_R
    for part, sx in (("pauldron_R", -1), ("pauldron_L", 1)):
        x0, x1 = ((-9, -5) if sx < 0 else (5, 9))
        b.fill_box(part, x0, x1, -3, 3, 10, 12, 9)
        b.fill_box(part, x0, x1, -2, 2, 13, 13, 8)
        b.set_voxel(part, x0 + 2, 0, 14, 8)

    # 7. hand_L, shield
    b.fill_box("hand_L", 6, 7, -1, 1, 3, 7, 1)
    b.fill_box("hand_L", 6, 7, -2, 0, 2, 3, 3)
    # Shield mounted on forearm
    b.fill_box("shield", 9, 9, -2, 2, 3, 7, 11) # crimson shield field
    b.fill_box("shield", 9, 9, -3, 3, 2, 8, 9)   # bronze outer rim
    b.fill_box("shield", 9, 9, -1, 1, 4, 6, 8)   # center bronze cross
    b.set_voxel("shield", 10, 0, 5, 8)           # center bronze boss

    # 8. hand_R, sword
    b.fill_box("hand_R", -8, -7, -1, 1, 3, 7, 1)
    b.fill_box("hand_R", -8, -7, -2, 0, 2, 3, 3)
    # Sword:
    b.fill_box("sword", -9, -6, -3, -1, 5, 5, 9)  # crossguard
    b.set_voxel("sword", -7, 0, 4, 8)             # pommel
    b.fill_box("sword", -8, -7, -11, -3, 5, 6, 13) # long blade
    b.fill_box("sword", -8, -7, -10, -4, 4, 4, 15) # blood groove
    b.set_voxel("sword", -8, -12, 5, 13)          # blade tip

    # 9. skull (z=[13..19])
    b.fill_box("skull", -4, 4, -4, 3, 13, 18, 1)
    b.fill_box("skull", -5, 5, -3, 2, 14, 18, 2)
    b.set_voxel("skull", 0, -5, 15, 4)
    b.set_voxel("skull", -3, -5, 14, 2)
    b.set_voxel("skull", 3, -5, 14, 2)
    for sx in (-1, 1):
        ex = sx * 2
        b.fill_box("skull", ex - 1, ex + 1, -5, -3, 16, 17, 4)
        b.set_voxel("skull", ex, -4, 16, 5) # cyan core
        b.set_voxel("skull", ex, -4, 17, 6) # glow
        b.set_voxel("skull", ex + sx, -4, 17, 7)
    b.fill_box("skull", -2, 2, -5, -4, 13, 13, 4)
    for tx in (-2, -1, 0, 1, 2):
        b.set_voxel("skull", tx, -5, 14, 1 if tx % 2 == 0 else 3)
        b.set_voxel("skull", tx, -5, 13, 2 if tx % 2 == 0 else 4)

    # 10. helmet (z=[19..22])
    b.fill_box("helmet", -5, 5, -5, 4, 19, 20, 8)
    b.fill_box("helmet", -4, 4, -4, 3, 21, 21, 9)
    b.fill_box("helmet", -3, 3, -3, 2, 22, 22, 10)
    for sx in (-1, 1):
        b.fill_box("helmet", sx * 5, sx * 5, -4, -1, 16, 18, 9)

    # 11. plume (z=[22..25])
    b.fill_box("plume", 0, 0, -4, 4, 23, 24, 11)
    b.fill_box("plume", 0, 0, -3, 3, 25, 25, 11)
    b.fill_box("plume", 0, 0, -4, -3, 22, 23, 12)
    b.fill_box("plume", 0, 0, 3, 4, 22, 23, 12)

    b.save(out_path)


# ==============================================================================
# 3. SKELETON MAGE (Chibi Void Lich - 16 Parts)
# ==============================================================================
def generate_skeleton_mage(out_path: str):
    """
    Sculpted Chibi Skeleton Mage / Lich:
    - 16 distinct parts matching engine tests and skeletal rig:
      [staff_orb, staff, hand_L, spell_flame, hand_R, hat, skull, shoulder_L,
       shoulder_R, soul_orb, ribcage, tabard, belt, pelvis, shoe_L, shoe_R]
    - Oversized peaked sorcerer cowl/hood with deep shadow interior
    - Glowing purple void aether eyes piercing through the cowl
    - Gold-embroidered mystic mantle & tattered royal violet robes over ribs
    - Ornate skull staff crowned with floating amethyst orb, purple spell flame
    """
    parts = [
        "staff_orb",
        "staff",
        "hand_L",
        "spell_flame",
        "hand_R",
        "hat",
        "skull",
        "shoulder_L",
        "shoulder_R",
        "soul_orb",
        "ribcage",
        "tabard",
        "belt",
        "pelvis",
        "shoe_L",
        "shoe_R",
    ]
    b = EnemyVoxBuilder(parts)

    # Palette
    b.set_color(1, 242, 238, 224)  # Bone bright
    b.set_color(2, 195, 188, 172)  # Bone mid
    b.set_color(3, 58, 42, 82)     # Robe royal violet bright
    b.set_color(4, 38, 26, 58)     # Robe violet mid
    b.set_color(5, 24, 16, 38)     # Robe violet dark / deep shadow
    b.set_color(6, 238, 188, 52)   # Arcane gold embroidery / gem bezel
    b.set_color(7, 175, 132, 34)   # Gold shade
    b.set_color(8, 245, 210, 255)  # Void purple bright (eye core / orb)
    b.set_color(9, 185, 75, 255)   # Void purple mid (eye glow)
    b.set_color(10, 115, 25, 185)  # Void purple deep
    b.set_color(11, 85, 58, 38)    # Staff twisted wood
    b.set_color(12, 54, 36, 22)    # Staff wood dark

    # 1. ribcage, soul_orb (z=[6..12])
    b.fill_box("ribcage", -1, 1, -1, 1, 6, 12, 5)
    for rz in (7, 9, 11):
        b.fill_box("ribcage", -3, 3, -3, -3, rz, rz, 1)
        b.fill_box("ribcage", -4, -4, -2, 1, rz, rz, 2)
        b.fill_box("ribcage", 4, 4, -2, 1, rz, rz, 2)
    b.fill_box("soul_orb", -1, 1, -2, 0, 8, 10, 9)
    b.set_voxel("soul_orb", 0, -1, 9, 8)

    # 2. tabard, belt, pelvis
    b.fill_box("pelvis", -4, 4, -3, 2, 4, 5, 4)
    b.fill_box("belt", -4, 4, -4, -3, 5, 5, 6)
    b.fill_box("tabard", -1, 1, -4, -4, 3, 5, 6)
    b.set_voxel("tabard", 0, -4, 4, 8)

    # 3. shoe_L, shoe_R (z=[0..3])
    for part, x0, x1 in (("shoe_R", 1, 4), ("shoe_L", -4, -1)):
        b.fill_box(part, x0, x1, -3, 2, 1, 3, 4)
        b.fill_box(part, x0, x1, -3, -3, 1, 2, 6)
        b.fill_box(part, x0, x1, -3, 1, 0, 0, 2)

    # 4. shoulder_L, shoulder_R
    for part, sx in (("shoulder_R", -1), ("shoulder_L", 1)):
        x0, x1 = ((-9, -5) if sx < 0 else (5, 9))
        b.fill_box(part, x0, x1, -3, 3, 10, 12, 3)
        b.fill_box(part, x0, x1, -2, 2, 13, 13, 6)

    # 5. hand_L, staff, staff_orb
    b.fill_box("hand_L", 6, 8, -2, 2, 4, 7, 3)
    b.fill_box("hand_L", 6, 8, -2, -2, 4, 7, 6)
    b.fill_box("hand_L", 7, 8, -2, 0, 2, 3, 1)

    # Staff:
    b.fill_box("staff", 9, 9, -2, -2, 0, 16, 11)
    b.set_voxel("staff", 9, -1, 7, 12)
    b.set_voxel("staff", 9, -3, 11, 12)
    b.fill_box("staff", 8, 10, -3, -1, 16, 16, 6) # gold prongs
    b.fill_box("staff", 8, 10, -3, -1, 17, 18, 1) # mini skull
    b.set_voxel("staff", 8, -3, 17, 10)
    b.set_voxel("staff", 10, -3, 17, 10)

    # Floating Violet Aether Orb hovering above staff
    b.fill_box("staff_orb", 8, 10, -3, -1, 19, 20, 9)
    b.set_voxel("staff_orb", 9, -2, 19, 8)
    b.set_voxel("staff_orb", 9, -2, 20, 8)
    b.set_voxel("staff_orb", 9, -2, 21, 10)

    # 6. hand_R, spell_flame
    b.fill_box("hand_R", -8, -6, -2, 2, 4, 7, 3)
    b.fill_box("hand_R", -8, -6, -2, -2, 4, 7, 6)
    b.fill_box("hand_R", -8, -7, -2, 0, 2, 3, 1)

    # Mystic spell flame hovering in front of casting hand
    b.fill_box("spell_flame", -8, -7, -6, -4, 4, 6, 9)
    b.set_voxel("spell_flame", -7, -5, 5, 8)
    b.set_voxel("spell_flame", -7, -5, 7, 10)

    # 7. skull
    b.fill_box("skull", -3, 3, -2, -1, 13, 17, 2)
    b.fill_box("skull", -2, 2, -3, -2, 13, 14, 1)
    for sx in (-1, 1):
        ex = sx * 2
        b.set_voxel("skull", ex, -3, 16, 8)
        b.set_voxel("skull", ex, -3, 17, 9)
        b.set_voxel("skull", ex + sx, -3, 17, 10)

    # 8. hat (Peaked Cowl / Hood)
    b.fill_box("hat", -5, 5, -4, 4, 13, 21, 3)
    b.fill_box("hat", -4, 4, -3, 4, 22, 23, 4)
    b.fill_box("hat", -2, 2, 0, 5, 24, 25, 4)
    b.set_voxel("hat", 0, 5, 25, 6)
    b.fill_box("hat", -5, -5, -5, -3, 13, 20, 6)
    b.fill_box("hat", 5, 5, -5, -3, 13, 20, 6)
    b.fill_box("hat", -4, 4, -5, -5, 20, 20, 6)
    b.fill_box("hat", -4, 4, -4, -1, 13, 19, 5) # deep shadow interior

    b.save(out_path)


# ==============================================================================
# 4. CHIBI SLIME GENERATOR (3 Parts)
# ==============================================================================
def generate_slime(out_path: str, variant: str = "forest"):
    """
    Builds a bouncy Chibi Slime with 3 distinct parts:
    - Slime_Body (Torso): Rounded translucent-look jelly drop (chibi shape, rounded corners)
    - Slime_Core (Head): Floating glowing nucleus inside that lags on bounces
    - Slime_Face (Root): Big expressive cartoon eyes with highlights + cute cheeks
    """
    parts = [
        "Slime_Body",
        "Slime_Core",
        "Slime_Face",
    ]
    b = EnemyVoxBuilder(parts)

    if variant == "aether":
        b.set_color(1, 110, 235, 255) # Jelly bright cyan
        b.set_color(2, 45, 185, 230)  # Jelly mid cyan
        b.set_color(3, 18, 125, 180)  # Jelly shade
        b.set_color(4, 235, 255, 255) # Inner core glow bright
        b.set_color(5, 75, 240, 255)  # Inner core mid
        b.set_color(6, 255, 255, 255) # Eye gleam / highlight
        b.set_color(7, 24, 32, 48)    # Eye dark pupil
        b.set_color(8, 150, 245, 255) # Cheeks
    else: # Forest green slime
        b.set_color(1, 115, 225, 95)  # Jelly bright lime
        b.set_color(2, 65, 185, 72)   # Jelly mid green
        b.set_color(3, 35, 135, 52)   # Jelly shade
        b.set_color(4, 220, 255, 140) # Core bright
        b.set_color(5, 145, 240, 65)  # Core mid
        b.set_color(6, 255, 255, 255) # Eye white / catchlight
        b.set_color(7, 25, 45, 30)    # Eye pupil dark
        b.set_color(8, 255, 165, 175) # Cute blush cheeks

    # 1. Slime_Body: Rounded dome / drop shape (x=[-7..7], y=[-7..7], z=[0..15])
    # Tier 0 (base): x=[-6..6], y=[-6..6]
    b.fill_box("Slime_Body", -6, 6, -6, 6, 0, 1, 3)
    b.fill_box("Slime_Body", -5, 5, -5, 5, 0, 1, 2)
    # Tier 1-2 (belly widest): x=[-7..7], y=[-7..7], z=[2..6]
    b.fill_box("Slime_Body", -7, 7, -6, 6, 2, 6, 2)
    b.fill_box("Slime_Body", -6, 6, -7, 7, 2, 6, 2)
    b.fill_box("Slime_Body", -6, 6, -6, 6, 2, 6, 1) # bright surface
    # Tier 3 (mid body): x=[-6..6], y=[-6..6], z=[7..9]
    b.fill_box("Slime_Body", -6, 6, -5, 5, 7, 9, 2)
    b.fill_box("Slime_Body", -5, 5, -6, 6, 7, 9, 2)
    b.fill_box("Slime_Body", -5, 5, -5, 5, 7, 9, 1)
    # Tier 4 (shoulder): x=[-5..5], y=[-5..5], z=[10..11]
    b.fill_box("Slime_Body", -5, 5, -4, 4, 10, 11, 2)
    b.fill_box("Slime_Body", -4, 4, -5, 5, 10, 11, 2)
    b.fill_box("Slime_Body", -4, 4, -4, 4, 10, 11, 1)
    # Tier 5 (crown droplet tip): z=[12..15]
    b.fill_box("Slime_Body", -3, 3, -3, 3, 12, 12, 1)
    b.fill_box("Slime_Body", -2, 2, -2, 2, 13, 13, 1)
    b.fill_box("Slime_Body", -1, 1, -1, 1, 14, 14, 1)
    b.set_voxel("Slime_Body", 0, 0, 15, 1) # droplet tip apex

    # 2. Slime_Core: Floating diamond nucleus inside at (x=[-2..2], y=[-2..2], z=[4..8])
    b.fill_box("Slime_Core", -2, 2, -2, 2, 5, 7, 5)
    b.fill_box("Slime_Core", -1, 1, -1, 1, 4, 8, 4)
    b.set_voxel("Slime_Core", 0, 0, 9, 4)
    b.set_voxel("Slime_Core", 0, 0, 3, 4)

    # 3. Slime_Face: Big Expressive Anime/Chibi Eyes at front (y=-8..-7, z=[4..7])
    for sx in (-1, 1):
        ex = sx * 3
        b.fill_box("Slime_Face", ex - 1, ex + 1, -7, -7, 5, 7, 6)
        b.fill_box("Slime_Face", ex, ex + 1, -8, -8, 5, 6, 7)
        b.set_voxel("Slime_Face", ex, -8, 7, 6)
        b.fill_box("Slime_Face", ex - 1, ex + 1, -7, -7, 4, 4, 8)

    # Cute little smile between eyes at y=-7, z=4
    b.set_voxel("Slime_Face", 0, -7, 4, 7)
    b.set_voxel("Slime_Face", -1, -7, 5, 7)
    b.set_voxel("Slime_Face", 1, -7, 5, 7)

    b.save(out_path)


# ==============================================================================
# 5. ORC BRUTE (Chibi Savage Berserker - 11 Parts)
# ==============================================================================
def generate_orc_brute(out_path: str):
    """
    Sculpted Chibi Orc Brute / Berserker:
    - 11 parts: [head, torso, belt, pelvis, pauldron_L, pauldron_R, hand_L, hand_R, weapon, boot_L, boot_R]
    - Broad muscular olive-green torso with crimson warpaint and scarred chest
    - Horned iron war-helm, glowing red eyes, heavy lower jaw with huge ivory tusks
    - Spiked black-iron pauldrons, skull-buckle belt, and double-bitted savage greataxe
    """
    parts = [
        "head",
        "torso",
        "belt",
        "pelvis",
        "pauldron_L",
        "pauldron_R",
        "hand_L",
        "hand_R",
        "weapon",
        "boot_L",
        "boot_R",
    ]
    b = EnemyVoxBuilder(parts)

    # Palette
    b.set_color(1, 96, 138, 52)    # Orc skin light olive
    b.set_color(2, 72, 108, 38)    # Orc skin mid
    b.set_color(3, 48, 76, 26)     # Orc skin dark shadow
    b.set_color(4, 195, 42, 36)    # Crimson warpaint / cloth
    b.set_color(5, 135, 24, 22)    # Crimson dark shade
    b.set_color(6, 255, 75, 35)    # Glowing berserker red eye core
    b.set_color(7, 185, 25, 18)    # Eye red glow
    b.set_color(8, 245, 238, 215)  # Ivory tusks & horn tips
    b.set_color(9, 198, 186, 158)  # Bone / horn base shade
    b.set_color(10, 68, 74, 82)    # Blackened iron armor mid
    b.set_color(11, 45, 48, 55)    # Blackened iron dark
    b.set_color(12, 115, 124, 136) # Iron edge highlight / spikes
    b.set_color(13, 182, 192, 204) # Greataxe razor steel edge
    b.set_color(14, 98, 68, 42)    # Dark leather straps / boots
    b.set_color(15, 64, 44, 26)    # Leather shadow
    b.set_color(16, 215, 168, 54)  # Brass studs / belt buckle

    # 1. boot_L, boot_R (z=[0..4])
    for part, x0, x1 in (("boot_R", 2, 6), ("boot_L", -6, -2)):
        b.fill_box(part, x0, x1, -4, 3, 0, 1, 15) # heavy sole
        b.fill_box(part, x0, x1, -3, 3, 2, 4, 14) # armored boot upper
        b.fill_box(part, x0, x1, -4, -3, 1, 3, 10) # iron toe plate
        b.set_voxel(part, (x0 + x1) // 2, -5, 1, 12) # toe spike

    # 2. pelvis & belt (z=[4..7])
    b.fill_box("pelvis", -5, 5, -3, 3, 4, 6, 15)
    b.fill_box("belt", -6, 6, -4, 4, 6, 7, 14)
    # Iron & brass skull-like buckle in front
    b.fill_box("belt", -2, 2, -5, -4, 5, 7, 16)
    b.fill_box("belt", -1, 1, -5, -5, 6, 7, 8)
    b.fill_box("belt", -2, 2, -4, -4, 3, 5, 4) # crimson loincloth hang

    # 3. torso (Barrel chest x=[-6..6], y=[-4..4], z=[7..15])
    b.fill_box("torso", -5, 5, -4, 4, 7, 15, 1)
    b.fill_box("torso", -6, 6, -3, 3, 8, 14, 2) # wide lats
    # Pectoral definition & abs shadow
    b.fill_box("torso", -4, -1, -5, -4, 11, 14, 1)
    b.fill_box("torso", 1, 4, -5, -4, 11, 14, 1)
    b.fill_box("torso", 0, 0, -5, -4, 8, 14, 3) # center chest crease
    b.fill_box("torso", -4, 4, -5, -4, 10, 10, 3) # under-pec shadow
    # Diagonal leather harness + crimson warpaint stripes across chest
    for i in range(-4, 5):
        b.set_voxel("torso", i, -5, 11 + (i // 2), 14)
        b.set_voxel("torso", -i, -5, 11 + (i // 2), 4)
    b.set_voxel("torso", 0, -5, 11, 16) # harness center ring

    # 4. pauldron_L, pauldron_R (Spiked iron shoulderplates z=[12..17])
    for part, sx in (("pauldron_R", -1), ("pauldron_L", 1)):
        x0, x1 = ((-10, -6) if sx < 0 else (6, 10))
        b.fill_box(part, x0, x1, -4, 4, 12, 15, 10)
        b.fill_box(part, x0 + (1 if sx < 0 else 0), x1 - (0 if sx < 0 else 1), -3, 3, 16, 16, 11)
        b.fill_box(part, x0, x1, -4, 4, 12, 12, 4) # crimson trim
        # Dual spikes on each pauldron
        b.fill_box(part, (x0 + x1) // 2, (x0 + x1) // 2, 0, 0, 17, 18, 12)
        b.set_voxel(part, (x0 + x1) // 2 + sx * 2, 0, 16, 12)

    # 5. hand_L, hand_R (Muscular arms with iron bracers z=[4..11])
    for part, sx in (("hand_R", -1), ("hand_L", 1)):
        x0, x1 = ((-10, -7) if sx < 0 else (7, 10))
        b.fill_box(part, x0, x1, -2, 2, 8, 11, 1) # bicep
        b.fill_box(part, x0, x1, -3, 2, 5, 7, 10) # iron bracer
        b.fill_box(part, x0, x1, -3, 1, 4, 5, 2)  # fist
        b.set_voxel(part, (x0 + x1) // 2, -4, 6, 16) # bracer stud

    # 6. weapon (Savage Double-Bitted Greataxe in right hand)
    # Long haft along y=[-12..2] at x=-8, z=[5..7]
    b.fill_box("weapon", -9, -8, -12, 2, 5, 6, 14)
    b.fill_box("weapon", -9, -8, 2, 3, 5, 6, 16) # pommel cap
    # Massive double axe blades at front (y=[-11..-5], z=[1..11])
    b.fill_box("weapon", -9, -8, -10, -6, 2, 10, 10) # dark iron core
    b.fill_box("weapon", -9, -8, -11, -5, 1, 2, 13)  # lower razor edge
    b.fill_box("weapon", -9, -8, -11, -5, 10, 11, 13) # upper razor edge
    b.fill_box("weapon", -9, -8, -12, -11, 3, 9, 13) # forward sweeping edge
    b.fill_box("weapon", -9, -8, -9, -7, 12, 12, 12) # top spike

    # 7. head (Chibi savage head with underbite tusks & horned helm z=[15..25])
    b.fill_box("head", -5, 5, -4, 4, 15, 22, 1)
    b.fill_box("head", -6, 6, -3, 3, 16, 20, 2)
    # Protruding lower jaw (underbite) at y=-5, z=[15..17]
    b.fill_box("head", -4, 4, -5, -4, 15, 17, 2)
    b.fill_box("head", -2, 2, -5, -5, 16, 16, 11) # mouth snarl
    # Huge lower tusks jutting up at x=-3, 3, y=-6, z=[16..19]
    for sx in (-1, 1):
        b.fill_box("head", sx * 3, sx * 3, -6, -5, 16, 18, 9)
        b.set_voxel("head", sx * 3, -6, 19, 8)
    # Pointed orc ears
    for sx in (-1, 1):
        b.fill_box("head", sx * 7, sx * 8, 0, 2, 18, 19, 2)
        b.set_voxel("head", sx * 9, 2, 19, 1)
    # Glowing red eyes under heavy brow
    for sx in (-1, 1):
        ex = sx * 3
        b.fill_box("head", ex - 1, ex + 1, -5, -4, 18, 19, 3)
        b.set_voxel("head", ex, -5, 18, 6)
        b.set_voxel("head", ex + sx, -5, 18, 7)
    # Blackened iron war-helm with noseguard & curved bull horns
    b.fill_box("head", -6, 6, -5, 4, 20, 23, 10)
    b.fill_box("head", -5, 5, -4, 3, 24, 24, 11)
    b.fill_box("head", 0, 0, -6, -5, 18, 22, 12) # iron nose guard
    # Curved horns on sides of helmet
    for sx in (-1, 1):
        b.fill_box("head", sx * 7, sx * 8, -1, 1, 21, 22, 9)
        b.fill_box("head", sx * 8, sx * 9, -2, 0, 23, 24, 8)
        b.set_voxel("head", sx * 9, -3, 25, 8)

    b.save(out_path)


# ==============================================================================
# 6. FOREST SPIDER (Chibi Venom Crawler - 7 Parts)
# ==============================================================================
def generate_forest_spider(out_path: str):
    """
    Sculpted Chibi Forest Spider / Venom Crawler:
    - 7 parts: [head, torso, stinger, left_hand, right_hand, left_foot, right_foot]
    - Chibi cephalothorax (head) with 6 glowing lime-emerald eyes and venomous dripping chelicerae
    - Armored dark-chitin thorax (torso) and bulbous striped abdomen (stinger) that bobs & lunges
    - Multi-leg clusters grouped into left/right front & rear sets for full animated scuttling
    """
    parts = [
        "head",
        "torso",
        "stinger",
        "left_hand",
        "right_hand",
        "left_foot",
        "right_foot",
    ]
    b = EnemyVoxBuilder(parts)

    # Palette
    b.set_color(1, 52, 42, 68)     # Chitin dark violet-charcoal
    b.set_color(2, 34, 26, 46)     # Chitin deep shadow
    b.set_color(3, 78, 64, 98)     # Chitin highlight ridge
    b.set_color(4, 125, 245, 65)   # Venom emerald bright glow (eyes / fangs)
    b.set_color(5, 55, 185, 38)    # Venom green mid
    b.set_color(6, 225, 255, 185)  # Eye core gleam
    b.set_color(7, 215, 165, 45)   # Abdomen warning stripe gold
    b.set_color(8, 165, 75, 35)    # Leg joint amber-orange
    b.set_color(9, 240, 235, 225)  # Web spinneret / fang ivory

    # 1. torso (Central cephalothorax-thorax bridge x=[-4..4], y=[-3..3], z=[4..9])
    b.fill_box("torso", -4, 4, -3, 3, 4, 8, 1)
    b.fill_box("torso", -3, 3, -2, 2, 9, 9, 3)

    # 2. head (Front face, 6 glowing eyes, pedipalps & dripping venom fangs y=[-9..-3], z=[4..11])
    b.fill_box("head", -5, 5, -8, -3, 5, 10, 1)
    b.fill_box("head", -4, 4, -7, -4, 11, 11, 3)
    # Cluster of 6 glowing emerald spider eyes across front brow (y=-9)
    for sx in (-1, 1):
        # Main large lower eyes
        b.fill_box("head", sx * 2, sx * 3, -9, -9, 7, 8, 4)
        b.set_voxel("head", sx * 2, -9, 8, 6)
        # Upper outer smaller eyes
        b.set_voxel("head", sx * 4, -9, 9, 4)
        # Inner upper eyes
        b.set_voxel("head", sx * 1, -9, 9, 5)
    # Venomous fangs (chelicerae) curving down at y=-9..-10, z=[2..5]
    for sx in (-1, 1):
        fx = sx * 2
        b.fill_box("head", fx - (1 if sx > 0 else 0), fx + (0 if sx > 0 else 1), -9, -8, 4, 6, 2)
        b.set_voxel("head", fx, -10, 3, 9) # ivory fang tip
        b.set_voxel("head", fx, -10, 2, 4) # dripping venom drop

    # 3. stinger (Bulbous rear abdomen y=[3..13], z=[4..14] with warning markings)
    b.fill_box("stinger", -6, 6, 3, 11, 5, 12, 1)
    b.fill_box("stinger", -7, 7, 4, 10, 6, 11, 2)
    b.fill_box("stinger", -5, 5, 4, 10, 13, 13, 3)
    b.fill_box("stinger", -4, 4, 5, 9, 14, 14, 1)
    # Vibrant toxic emerald + gold hourglass/chevron markings on dorsal abdomen
    for y_stripe in (5, 8, 10):
        b.fill_box("stinger", -4, 4, y_stripe, y_stripe, 13, 14, 7)
        b.fill_box("stinger", -2, 2, y_stripe, y_stripe, 14, 14, 4)
    # Rear spinneret & venom stinger tip at y=12..13
    b.fill_box("stinger", -2, 2, 12, 12, 6, 8, 2)
    b.set_voxel("stinger", 0, 13, 7, 4)

    # 4. Articulated Spider Legs (2 pairs per side: front pairs on left_hand/right_hand, rear pairs on left_foot/right_foot)
    def build_leg_pair(part: str, sx: int, y_offsets: Tuple[int, int]):
        for yo in y_offsets:
            # Upper femur rising outward from body
            b.fill_box(part, sx * 5, sx * 8, yo - 1, yo + 1, 7, 9, 1)
            b.fill_box(part, sx * 8, sx * 9, yo - 1, yo + 1, 8, 10, 8) # amber knee joint
            # Lower tibia/tarsus angling sharply down to ground z=[0..8]
            b.fill_box(part, sx * 9, sx * 10, yo - 1, yo + 1, 3, 8, 2)
            b.fill_box(part, sx * 10, sx * 11, yo, yo, 0, 3, 1)
            b.set_voxel(part, sx * 11, yo, 0, 4) # venom-tipped claw foot

    build_leg_pair("right_hand", -1, (-5, -1))
    build_leg_pair("left_hand", 1, (-5, -1))
    build_leg_pair("right_foot", -1, (3, 7))
    build_leg_pair("left_foot", 1, (3, 7))

    b.save(out_path)


# ==============================================================================
# 7. STONE GOLEM (Chibi Ancient Aether Construct - 10 Parts)
# ==============================================================================
def generate_stone_golem(out_path: str):
    """
    Sculpted Chibi Stone / Aether Golem:
    - 10 parts: [head, torso, soul_orb, pelvis, pauldron_L, pauldron_R, hand_L, hand_R, boot_L, boot_R]
    - Hulking ancient monolith silhouette crafted from weathered basalt & mossy granite slabs
    - Hollowed runic chest cavity housing a radiant floating Aether crystal core (soul_orb)
    - Glowing cyan rune-carved monolith head and colossal boulder-smashing fists
    """
    parts = [
        "head",
        "torso",
        "soul_orb",
        "pelvis",
        "pauldron_L",
        "pauldron_R",
        "hand_L",
        "hand_R",
        "boot_L",
        "boot_R",
    ]
    b = EnemyVoxBuilder(parts)

    # Palette
    b.set_color(1, 118, 124, 132)  # Granite stone light
    b.set_color(2, 86, 92, 100)    # Basalt stone mid
    b.set_color(3, 56, 60, 68)     # Deep stone shadow / cracks
    b.set_color(4, 148, 155, 162)  # Stone edge highlight
    b.set_color(5, 78, 142, 62)    # Ancient forest moss mid
    b.set_color(6, 112, 178, 78)   # Moss highlight
    b.set_color(7, 215, 255, 255)  # Aether crystal core white-cyan
    b.set_color(8, 45, 220, 250)   # Aether rune cyan glow
    b.set_color(9, 18, 130, 195)   # Aether deep facet
    b.set_color(10, 195, 155, 65)  # Ancient bronze rune trim

    # 1. boot_L, boot_R (Pillar stone legs z=[0..5])
    for part, x0, x1 in (("boot_R", 2, 7), ("boot_L", -7, -2)):
        b.fill_box(part, x0, x1, -4, 4, 0, 2, 3)
        b.fill_box(part, x0, x1, -3, 3, 2, 5, 2)
        b.fill_box(part, x0 + 1, x1 - 1, -4, -4, 1, 4, 1)
        b.set_voxel(part, (x0 + x1) // 2, -4, 3, 8) # glowing rune on shin

    # 2. pelvis (Runic waist keystone z=[5..8])
    b.fill_box("pelvis", -5, 5, -3, 3, 5, 8, 2)
    b.fill_box("pelvis", -4, 4, -4, -3, 6, 7, 10) # bronze rune belt
    b.set_voxel("pelvis", 0, -4, 6, 8)

    # 3. torso (Massive stone arch around hollow crystal chamber z=[8..17])
    b.fill_box("torso", -7, 7, -4, 4, 8, 17, 2)
    b.fill_box("torso", -6, 6, -5, 3, 9, 16, 1)
    # Carve hollow central cavity in chest for the floating soul_orb
    b.fill_box("torso", -3, 3, -5, 2, 10, 15, 3)
    for x in range(-2, 3):
        for y in range(-5, 2):
            for z in range(11, 15):
                b.remove_voxel("torso", x, y, z)
    # Moss patches on upper back & chest ledges
    b.fill_box("torso", -6, -3, -4, 3, 17, 17, 5)
    b.fill_box("torso", 3, 6, -3, 4, 17, 17, 6)
    # Glowing cyan rune channels on chest pillars
    for sx in (-1, 1):
        b.fill_box("torso", sx * 5, sx * 5, -5, -5, 10, 15, 8)

    # 4. soul_orb (Floating radiant Aether Core inside torso cavity z=[11..15])
    b.fill_box("soul_orb", -2, 2, -3, 1, 12, 14, 8)
    b.fill_box("soul_orb", -1, 1, -4, 2, 11, 15, 7)
    b.set_voxel("soul_orb", 0, -2, 16, 9)
    b.set_voxel("soul_orb", 0, -2, 10, 9)

    # 5. pauldron_L, pauldron_R (Floating moss-covered boulder shoulders z=[13..19])
    for part, sx in (("pauldron_R", -1), ("pauldron_L", 1)):
        x0, x1 = ((-12, -7) if sx < 0 else (7, 12))
        b.fill_box(part, x0, x1, -4, 4, 13, 18, 2)
        b.fill_box(part, x0 + 1, x1 - 1, -3, 3, 18, 19, 5) # lush moss cap
        b.set_voxel(part, (x0 + x1) // 2, 0, 20, 6)
        # Aether crystal shards sprouting from shoulder
        b.fill_box(part, (x0 + x1) // 2 + sx, (x0 + x1) // 2 + sx, -1, 1, 19, 21, 8)
        b.set_voxel(part, (x0 + x1) // 2 + sx, 0, 22, 7)

    # 6. hand_L, hand_R (Colossal stone-crusher fists reaching down to z=[2..12])
    for part, sx in (("hand_R", -1), ("hand_L", 1)):
        x0, x1 = ((-12, -8) if sx < 0 else (8, 12))
        b.fill_box(part, x0 + 1, x1 - 1, -2, 2, 9, 12, 3) # upper stone arm link
        # Huge heavy forearm & boulder fist (z=[2..8])
        b.fill_box(part, x0, x1, -5, 4, 2, 8, 2)
        b.fill_box(part, x0, x1, -5, -4, 3, 7, 4) # knuckle plates
        # Glowing cyan rune strip along forearm
        b.fill_box(part, (x0 + x1) // 2, (x0 + x1) // 2, -5, -5, 4, 7, 8)
        b.fill_box(part, x0, x1, -4, 3, 8, 8, 10) # bronze wrist band

    # 7. head (Ancient monolith head recessed between shoulders z=[17..25])
    b.fill_box("head", -4, 4, -5, 3, 17, 24, 1)
    b.fill_box("head", -5, 5, -4, 2, 18, 23, 2)
    b.fill_box("head", -3, 3, -4, 2, 24, 25, 5) # mossy crown
    # Deep horizontal visor slit with glowing cyan aether eyes
    b.fill_box("head", -4, 4, -5, -4, 20, 21, 3)
    b.fill_box("head", -3, -1, -5, -5, 20, 21, 8)
    b.fill_box("head", 1, 3, -5, -5, 20, 21, 8)
    b.set_voxel("head", -2, -5, 20, 7)
    b.set_voxel("head", 2, -5, 20, 7)
    # Forehead glowing rune
    b.fill_box("head", 0, 0, -5, -5, 22, 23, 8)

    b.save(out_path)


# ==============================================================================
# 8. WRAITH (Chibi Void Specter - 7 Parts)
# ==============================================================================
def generate_wraith(out_path: str):
    """
    Sculpted Chibi Void Wraith:
    - 7 parts: [head, torso, soul_orb, hand_L, hand_R, wing_L, wing_R]
    - Deep shadowy cowl with piercing glowing cyan eyes inside pitch void
    - Tattered ethereal spectral mantle (torso) floating over ground
    - Floating radiant soul orb core inside shadowy chest
    - Detached floating spectral claws (hand_L, hand_R)
    - Wispy ethereal vapor ribbons/wings (wing_L, wing_R) trailing backwards
    """
    parts = [
        "head",
        "torso",
        "soul_orb",
        "hand_L",
        "hand_R",
        "wing_L",
        "wing_R",
    ]
    b = EnemyVoxBuilder(parts)

    # Palette
    b.set_color(1, 26, 24, 38)     # Shadow cowl dark violet-black
    b.set_color(2, 42, 38, 60)     # Cowl mid violet
    b.set_color(3, 62, 56, 88)     # Cowl highlight edge
    b.set_color(4, 18, 16, 26)     # Deepest void / eye socket interior
    b.set_color(5, 215, 255, 255)  # Ethereal cyan core gleam
    b.set_color(6, 65, 220, 245)   # Ethereal cyan bright glow
    b.set_color(7, 24, 135, 195)   # Ethereal cyan deep
    b.set_color(8, 145, 95, 215)   # Spectral mist violet-cyan blend
    b.set_color(9, 210, 215, 230)  # Spectral bone claw pale ivory
    b.set_color(10, 160, 168, 185) # Claw shadow

    # 1. Torso: Tattered ghostly shroud floating above ground (z=[5..16])
    # Floating shroud body (tapering downwards with ragged edges)
    b.fill_box("torso", -4, 4, -3, 3, 10, 16, 1)
    b.fill_box("torso", -5, 5, -2, 2, 11, 15, 2)
    b.fill_box("torso", -3, 3, -2, 2, 7, 9, 1)
    b.fill_box("torso", -2, 2, -1, 1, 5, 6, 2)
    # Ragged ghostly tail wisps trailing down to z=2..4
    b.fill_box("torso", -1, 0, 0, 1, 3, 4, 8)
    b.set_voxel("torso", 1, -1, 4, 8)
    b.set_voxel("torso", -2, 1, 3, 7)
    b.set_voxel("torso", 0, 1, 2, 6)
    # Hollow center cavity for soul_orb
    for x in range(-2, 3):
        for y in range(-3, 2):
            for z in range(11, 15):
                b.remove_voxel("torso", x, y, z)
    # Ghostly trim highlights on shroud rim
    for sx in (-1, 1):
        b.fill_box("torso", sx * 4, sx * 4, -3, -3, 9, 13, 8)

    # 2. Soul Orb: Pulsing ethereal heart inside shroud cavity (z=[11..15])
    b.fill_box("soul_orb", -1, 1, -2, 0, 12, 14, 6)
    b.set_voxel("soul_orb", 0, -1, 13, 5) # bright core
    b.set_voxel("soul_orb", 0, -1, 11, 7)
    b.set_voxel("soul_orb", 0, -1, 15, 7)

    # 3. Head: Deep hooded cowl with dark void face & glowing cyan eyes (z=[16..26])
    # Outer hood
    b.fill_box("head", -5, 5, -4, 4, 17, 24, 1)
    b.fill_box("head", -6, 6, -3, 3, 18, 23, 2)
    b.fill_box("head", -4, 4, -3, 3, 25, 25, 2)
    b.fill_box("head", -3, 3, -2, 2, 26, 26, 3) # hood peak
    b.fill_box("head", -1, 1, 3, 5, 22, 24, 1)  # hood back drapery
    # Face cavity (deep black void at y=[-5..-2], z=[18..22])
    b.fill_box("head", -4, 4, -5, -3, 18, 22, 4)
    # Piercing cyan spectral eyes
    for sx in (-1, 1):
        ex = sx * 2
        b.set_voxel("head", ex, -4, 20, 6)
        b.set_voxel("head", ex, -4, 21, 5) # bright pupil
        b.set_voxel("head", ex + sx, -4, 20, 7) # eye flame flare

    # 4. Floating Spectral Claws: hand_L, hand_R (z=[7..14])
    for part, sx in (("hand_R", -1), ("hand_L", 1)):
        x0 = sx * 7
        # Floating mist wrist
        b.fill_box(part, x0 - (1 if sx > 0 else 0), x0 + (0 if sx > 0 else 1), -1, 1, 12, 14, 8)
        # Claw hand palm
        b.fill_box(part, x0 - 1, x0 + 1, -3, -1, 10, 12, 9)
        # Spindly elongated bone talons curving forward/downward
        for fx in (-1, 0, 1):
            cx = x0 + fx
            b.fill_box(part, cx, cx, -4, -3, 8, 10, 9)
            b.set_voxel(part, cx, -5, 7, 10) # sharp claw tip
            b.set_voxel(part, cx, -5, 6, 6)  # wisp of cyan energy at fingertip

    # 5. Wispy Ethereal Wings/Ribbons: wing_L, wing_R (z=[10..18], y=[3..9])
    for part, sx in (("wing_R", -1), ("wing_L", 1)):
        # Flowing spectral mantle ribbons trailing back and oscillating
        b.fill_box(part, sx * 4, sx * 7, 3, 5, 14, 17, 8)
        b.fill_box(part, sx * 5, sx * 9, 5, 7, 12, 16, 7)
        b.fill_box(part, sx * 7, sx * 10, 7, 9, 9, 14, 6)
        b.set_voxel(part, sx * 10, 9, 8, 5)

    b.save(out_path)


# ==============================================================================
# 9. CATERPILLAR (Chibi Toxic Grub - 7 Parts)
# ==============================================================================
def generate_caterpillar(out_path: str):
    """
    Sculpted Chibi Caterpillar:
    - 7 parts: [head, torso, stinger, hand_L, hand_R, boot_L, boot_R]
    - Chubby rounded head with cute anime compound eyes, chewing mandibles, and antennae
    - Segmented mid-body (torso) with bright poisonous markings & toxic spines
    - Rear body segment (stinger) with caudal horn and warning coloration
    - Front crawling nub legs (hand_L, hand_R) and rear crawling nub legs (boot_L, boot_R)
    """
    parts = [
        "head",
        "torso",
        "stinger",
        "hand_L",
        "hand_R",
        "boot_L",
        "boot_R",
    ]
    b = EnemyVoxBuilder(parts)

    # Palette
    b.set_color(1, 95, 205, 55)    # Caterpillar lime bright
    b.set_color(2, 65, 160, 38)    # Lime mid
    b.set_color(3, 42, 110, 26)    # Lime shadow / segment seam
    b.set_color(4, 255, 215, 45)   # Warning spot bright yellow
    b.set_color(5, 240, 75, 45)    # Toxic red spine / antenna tip
    b.set_color(6, 32, 28, 44)     # Eye dark iris
    b.set_color(7, 255, 255, 255)  # Eye glint white
    b.set_color(8, 220, 160, 240)  # Cheerful belly lavender / pastel underbelly
    b.set_color(9, 175, 115, 195)  # Belly seam shadow
    b.set_color(10, 85, 240, 210)  # Toxic bio-luminescent spots

    # 1. Torso: Middle plump body segment (y=[-2..5], z=[2..10])
    b.fill_box("torso", -5, 5, -2, 5, 3, 9, 1)
    b.fill_box("torso", -4, 4, -1, 4, 10, 10, 2)
    # Pastel underbelly
    b.fill_box("torso", -3, 3, -2, 5, 2, 2, 8)
    # Segment ribs & warning dots
    b.fill_box("torso", -5, -5, 0, 3, 6, 7, 4)
    b.fill_box("torso", 5, 5, 0, 3, 6, 7, 4)
    b.set_voxel("torso", -5, 1, 6, 5) # red center spot
    b.set_voxel("torso", 5, 1, 6, 5)
    # Toxic dorsal spines along back
    for y_spine in (0, 3):
        b.fill_box("torso", -1, 1, y_spine, y_spine, 11, 12, 5)
        b.set_voxel("torso", 0, y_spine, 13, 4)

    # 2. Head: Chubby front segment with cute big eyes, antennae & mandibles (y=[-9..-3], z=[2..12])
    b.fill_box("head", -5, 5, -8, -3, 3, 10, 1)
    b.fill_box("head", -4, 4, -7, -4, 11, 11, 2)
    b.fill_box("head", -3, 3, -7, -4, 2, 2, 8) # chin underbelly
    # Big expressive chibi eyes (front face at y=-9)
    for sx in (-1, 1):
        ex = sx * 3
        b.fill_box("head", ex - 1, ex + 1, -9, -9, 5, 8, 6) # dark eye base
        b.set_voxel("head", ex, -9, 7, 7)                   # cute upper glint
        b.set_voxel("head", ex - sx, -9, 6, 10)              # bio-glow pupil highlight
    # Cute mandibles at y=-9, z=[3..4]
    for sx in (-1, 1):
        b.fill_box("head", sx * 1, sx * 2, -9, -9, 3, 4, 4)
        b.set_voxel("head", sx * 1, -10, 3, 5)
    # Pair of curved antennae on top of head (z=[11..15])
    for sx in (-1, 1):
        ax = sx * 3
        b.set_voxel("head", ax, -6, 12, 1)
        b.set_voxel("head", ax + sx, -6, 13, 2)
        b.set_voxel("head", ax + sx * 2, -7, 14, 4)
        b.set_voxel("head", ax + sx * 2, -7, 15, 5) # red bulb tip

    # 3. Stinger / Rear Abdomen segment (y=[6..13], z=[2..9])
    b.fill_box("stinger", -4, 4, 6, 12, 3, 8, 1)
    b.fill_box("stinger", -3, 3, 7, 11, 9, 9, 2)
    b.fill_box("stinger", -2, 2, 6, 11, 2, 2, 8) # rear underbelly
    # Warning spots on flanks
    b.fill_box("stinger", -4, -4, 8, 10, 5, 6, 4)
    b.fill_box("stinger", 4, 4, 8, 10, 5, 6, 4)
    # Caudal horn at rear tip
    b.fill_box("stinger", -1, 1, 11, 12, 9, 10, 5)
    b.set_voxel("stinger", 0, 13, 11, 4)

    # 4. Crawling Nub Legs (hand_L, hand_R = front pairs; boot_L, boot_R = rear pairs)
    for part, sx in (("hand_R", -1), ("hand_L", 1)):
        x0 = sx * 5
        # Front 2 chubby prolegs (y=-6, y=-3)
        for yo in (-6, -3):
            b.fill_box(part, x0, x0 + sx * 2, yo - 1, yo + 1, 1, 3, 1)
            b.fill_box(part, x0 + sx, x0 + sx * 2, yo - 1, yo + 1, 0, 0, 8) # soft suction pad

    for part, sx in (("boot_R", -1), ("boot_L", 1)):
        x0 = sx * 5
        # Rear 2 chubby prolegs (y=2, y=7)
        for yo in (2, 7):
            b.fill_box(part, x0, x0 + sx * 2, yo - 1, yo + 1, 1, 3, 1)
            b.fill_box(part, x0 + sx, x0 + sx * 2, yo - 1, yo + 1, 0, 0, 8)

    b.save(out_path)


# ==============================================================================
# 10. BIG LIZARD (Chibi Scaled Drake / Basilisk - 7 Parts)
# ==============================================================================
def generate_big_lizard(out_path: str):
    """
    Sculpted Chibi Big Lizard (Basilisk / Drake):
    - 7 parts: [head, torso, stinger, hand_L, hand_R, boot_L, boot_R]
    - Broad armored reptilian snout with jagged teeth, amber slit eyes, and spined ear frills
    - Muscular scaled torso with spiked dorsal ridge and cream belly scales
    - Heavy articulated tail (stinger) with whip-like scute spines
    - Strong clawed forelegs (hand_L, hand_R) and hindlegs (boot_L, boot_R)
    """
    parts = [
        "head",
        "torso",
        "stinger",
        "hand_L",
        "hand_R",
        "boot_L",
        "boot_R",
    ]
    b = EnemyVoxBuilder(parts)

    # Palette
    b.set_color(1, 46, 128, 92)    # Scaled emerald-teal light
    b.set_color(2, 28, 88, 65)     # Teal mid scale
    b.set_color(3, 18, 55, 42)     # Deep scale shadow
    b.set_color(4, 215, 175, 85)   # Desert cream / pale throat underbelly
    b.set_color(5, 165, 125, 55)   # Belly seam
    b.set_color(6, 255, 185, 25)   # Amber reptilian eye
    b.set_color(7, 25, 18, 12)     # Slit pupil black
    b.set_color(8, 245, 240, 225)  # Fang ivory
    b.set_color(9, 215, 65, 45)    # Throat sac crimson / tongue
    b.set_color(10, 225, 135, 45)  # Dorsal spine horn bright amber
    b.set_color(11, 160, 85, 30)   # Spine base

    # 1. Torso: Heavy scaled reptilian body (y=[-4..6], z=[3..11])
    b.fill_box("torso", -5, 5, -4, 6, 4, 9, 1)
    b.fill_box("torso", -6, 6, -3, 5, 5, 8, 2)
    b.fill_box("torso", -4, 4, -3, 5, 10, 10, 2)
    # Cream scaly underbelly
    b.fill_box("torso", -3, 3, -4, 6, 3, 3, 4)
    # Dorsal spiny ridge along spine (z=[11..13])
    for y_ridge in (-3, -1, 1, 3, 5):
        b.fill_box("torso", 0, 0, y_ridge, y_ridge, 11, 12, 10)
        b.set_voxel("torso", 0, y_ridge, 13, 10)

    # 2. Head: Broad menacing snout, fangs, amber slit eyes & spined crest (y=[-13..-4], z=[3..13])
    # Main skull
    b.fill_box("head", -5, 5, -9, -4, 4, 11, 1)
    b.fill_box("head", -6, 6, -8, -5, 5, 10, 2)
    # Long tapered snout extending forward to y=-13
    b.fill_box("head", -4, 4, -13, -9, 4, 8, 1)
    b.fill_box("head", -3, 3, -12, -9, 9, 9, 2)
    # Nostrils at y=-13
    b.set_voxel("head", -2, -13, 8, 3)
    b.set_voxel("head", 2, -13, 8, 3)
    # Cream throat scales underneath
    b.fill_box("head", -3, 3, -11, -4, 3, 3, 4)
    # Menacing ivory fangs protruding from upper & lower jaw
    for y_fang in (-12, -10):
        b.set_voxel("head", -4, y_fang, 3, 8)
        b.set_voxel("head", 4, y_fang, 3, 8)
    # Flicking forked tongue between fangs (y=-14..-12, z=4)
    b.set_voxel("head", 0, -14, 4, 9)
    b.set_voxel("head", -1, -15, 4, 9)
    b.set_voxel("head", 1, -15, 4, 9)
    # Amber slit eyes (on side angles of skull at y=-8)
    for sx in (-1, 1):
        ex = sx * 5
        b.fill_box("head", ex, ex + sx, -8, -7, 8, 10, 6) # amber field
        b.fill_box("head", ex + sx, ex + sx, -8, -7, 9, 9, 7) # black vertical slit
        b.set_voxel("head", ex, -7, 10, 10) # brow ridge horn
    # Spined reptilian ear frills flaring outward at back of head
    for sx in (-1, 1):
        fx = sx * 6
        b.fill_box("head", fx, fx + sx * 2, -5, -4, 7, 12, 10)
        b.set_voxel("head", fx + sx * 2, -4, 13, 11)

    # 3. Stinger / Tail: Thick tapering swiping tail with dorsal scutes (y=[7..18], z=[3..8])
    b.fill_box("stinger", -4, 4, 7, 10, 4, 8, 1)
    b.fill_box("stinger", -3, 3, 11, 14, 4, 7, 1)
    b.fill_box("stinger", -2, 2, 15, 17, 4, 6, 2)
    b.fill_box("stinger", -1, 1, 18, 19, 4, 5, 2)
    b.set_voxel("stinger", 0, 20, 4, 10) # sharp tail tip
    # Cream underside of tail
    b.fill_box("stinger", -2, 2, 7, 14, 3, 3, 4)
    # Dorsal tail scute spikes
    for y_tail in (8, 11, 14, 17):
        b.set_voxel("stinger", 0, y_tail, 8 if y_tail <= 10 else (7 if y_tail <= 14 else 6), 10)

    # 4. Forelegs (hand_L, hand_R): Muscular splayed front legs with sharp claws (z=[0..6])
    for part, sx in (("hand_R", -1), ("hand_L", 1)):
        x0 = sx * 6
        # Muscular shoulder & upper limb splaying out
        b.fill_box(part, x0, x0 + sx * 3, -3, 0, 4, 6, 2)
        # Forearm dropping down
        b.fill_box(part, x0 + sx * 2, x0 + sx * 4, -4, -1, 1, 4, 1)
        # Splayed 3-toed claw foot on ground (z=0)
        b.fill_box(part, x0 + sx * 2, x0 + sx * 4, -5, -2, 0, 1, 2)
        for fx in (-1, 0, 1):
            cx = x0 + sx * 3 + fx
            b.set_voxel(part, cx, -6, 0, 8) # ivory claw talons

    # 5. Hindlegs (boot_L, boot_R): Powerful back legs for lunging (z=[0..6])
    for part, sx in (("boot_R", -1), ("boot_L", 1)):
        x0 = sx * 6
        # Heavy thigh
        b.fill_box(part, x0, x0 + sx * 3, 3, 6, 4, 7, 2)
        # Lower leg
        b.fill_box(part, x0 + sx * 2, x0 + sx * 4, 2, 5, 1, 4, 1)
        # Heavy claw foot on ground
        b.fill_box(part, x0 + sx * 2, x0 + sx * 4, 1, 4, 0, 1, 2)
        for fx in (-1, 0, 1):
            cx = x0 + sx * 3 + fx
            b.set_voxel(part, cx, 0, 0, 8) # rear claws

    b.save(out_path)


def main():
    target_dir = os.path.join("Assets", "models", "enemies")
    print(f"Generating high-detail stylized chibi enemies into '{target_dir}'...")

    generate_goblin(os.path.join(target_dir, "goblin.vox"))
    generate_skeleton_warrior(os.path.join(target_dir, "skeleton_warrior.vox"))
    generate_skeleton_mage(os.path.join(target_dir, "skeleton_mage.vox"))
    generate_slime(os.path.join(target_dir, "slime.vox"), "forest")
    generate_slime(os.path.join(target_dir, "slime_aether.vox"), "aether")
    generate_orc_brute(os.path.join(target_dir, "orc_brute.vox"))
    generate_forest_spider(os.path.join(target_dir, "forest_spider.vox"))
    generate_stone_golem(os.path.join(target_dir, "stone_golem.vox"))
    generate_wraith(os.path.join(target_dir, "wraith.vox"))
    generate_caterpillar(os.path.join(target_dir, "caterpillar.vox"))
    generate_big_lizard(os.path.join(target_dir, "big_lizard.vox"))
    print("\nAll high-detail stylized enemies generated successfully!")


if __name__ == "__main__":
    main()

