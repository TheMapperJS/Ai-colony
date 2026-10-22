#!/usr/bin/env python3
"""
Procedural Multi-Part MagicaVoxel (.vox v150) Character Generator
Generates 8-part humanoid character rigs in Assets/models/human/ matching character2.vox's
exact skeletal part names, facing convention (-Y in MagicaVoxel = +Z player forward in Engine),
and proportions, with distinct hairstyles, headgear, ears, facial features, and armor:
- character3.vox (ranger):  Woodland Elf Ranger (long pointed elf ears, silver hair + circlet, forest tunic & leather baldric)
- character4.vox (paladin): Ironbeard Paladin (copper hair + braided beard & mustache, gold coronet, silver- &-blue plate armor)
- character5.vox (mage):    Arcane Sorceress (lavender side-locks, pointed mage hat with cyan gem, purple-and-gold robes)
- character6.vox (rogue):   Crimson Shinobi (spiky black-silver hair, ninja face mask, crimson headband, stealth gi)
"""

import argparse
import struct
from pathlib import Path
from typing import Dict, List, Tuple


PART_NAMES = [
    "Shoulder_right",
    "Right_Arm_Hand",
    "Head_Hair_Ears",
    "Shoulder_left",
    "Left_Arm_Hand",
    "Torso_Body",
    "Right_Foot",
    "Left_Foot",
]


class CharacterVoxBuilder:
    """Builds an 8-part MagicaVoxel v150 character in global MagicaVoxel coordinates."""

    def __init__(self):
        self.parts: Dict[str, Dict[Tuple[int, int, int], int]] = {name: {} for name in PART_NAMES}
        self.palette: List[Tuple[int, int, int, int]] = [(0, 0, 0, 255)] * 256

    def set_color(self, index: int, r: int, g: int, b: int, a: int = 255):
        if 1 <= index <= 255:
            self.palette[index - 1] = (int(r), int(g), int(b), int(a))

    def set_voxel(self, part: str, x: int, y: int, z: int, color_index: int):
        if 1 <= color_index <= 255:
            self.parts[part][(int(x), int(y), int(z))] = int(color_index)

    def remove_voxel(self, part: str, x: int, y: int, z: int):
        self.parts[part].pop((int(x), int(y), int(z)), None)

    def fill_box(
        self,
        part: str,
        x0: int,
        x1: int,
        y0: int,
        y1: int,
        z0: int,
        z1: int,
        color_index: int,
    ):
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

        # Match character2.vox layer assignments & named/colored LAYR chunks for easy editing in MagicaVoxel
        part_layers = {
            "Shoulder_right": 5,
            "Right_Arm_Hand": 4,
            "Head_Hair_Ears": 6,
            "Shoulder_left": 5,
            "Left_Arm_Hand": 3,
            "Torso_Body": 2,
            "Right_Foot": 1,
            "Left_Foot": 0,
        }
        layer_defs = [
            (0, "Left_Foot", "255 204 153"),
            (1, "Right_Foot", "255 80 80"),
            (2, "Torso_Body", "246 129 143"),
            (3, "Left_Arm_Hand", "177 83 200"),
            (4, "Right_Arm_Hand", "86 135 210"),
            (5, "Shoulder_Pauldrons", "80 85 200"),
            (6, "Head_Hair_Ears", "60 165 163"),
            (7, None, "144 180 75"),
        ] + [(lid, None, "150 150 150") for lid in range(8, 16)]

        part_translations: List[Tuple[str, int, int, int]] = []
        for part_name in PART_NAMES:
            voxels = self.parts[part_name]
            if not voxels:
                raise ValueError(f"Part {part_name} is empty.")
            xs = [c[0] for c in voxels]
            ys = [c[1] for c in voxels]
            zs = [c[2] for c in voxels]
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)
            min_z, max_z = min(zs), max(zs)

            size_x = max_x - min_x + 1
            size_y = max_y - min_y + 1
            size_z = max_z - min_z + 1

            # MagicaVoxel scene mode requires integer translations: min + size // 2
            tx = min_x + size_x // 2
            ty = min_y + size_y // 2
            tz = min_z + size_z // 2
            if part_name in ("Shoulder_right", "Shoulder_left") and min_z == 10 and max_z == 13:
                tz = 11
            part_translations.append((part_name, tx, ty, tz))

            chunks.append(self._chunk(b"SIZE", struct.pack("<iii", size_x, size_y, size_z)))
            xyzi_data = [struct.pack("<i", len(voxels))]
            for (gx, gy, gz), col in voxels.items():
                xyzi_data.append(
                    struct.pack("<BBBB", gx - min_x, gy - min_y, gz - min_z, col)
                )
            chunks.append(self._chunk(b"XYZI", b"".join(xyzi_data)))

        root_trn = (
            struct.pack("<i", 0)
            + self._dict_bytes({"_name": "character"})
            + struct.pack("<iiii", 1, -1, -1, 1)
            + self._dict_bytes({})
        )
        chunks.append(self._chunk(b"nTRN", root_trn))

        child_ids = [2 + 2 * i for i in range(len(PART_NAMES))]
        root_grp = (
            struct.pack("<i", 1)
            + self._dict_bytes({})
            + struct.pack("<i", len(child_ids))
            + struct.pack(f"<{len(child_ids)}i", *child_ids)
        )
        chunks.append(self._chunk(b"nGRP", root_grp))

        for i, (part_name, tx, ty, tz) in enumerate(part_translations):
            trn_id = 2 + 2 * i
            shp_id = 3 + 2 * i
            layer_id = part_layers.get(part_name, i)
            t_str = f"{tx} {ty} {tz}"
            trn_content = (
                struct.pack("<i", trn_id)
                + self._dict_bytes({"_name": part_name})
                + struct.pack("<iiii", shp_id, -1, layer_id, 1)
                + self._dict_bytes({"_t": t_str})
            )
            chunks.append(self._chunk(b"nTRN", trn_content))

            shp_content = (
                struct.pack("<i", shp_id)
                + self._dict_bytes({})
                + struct.pack("<ii", 1, i)
                + self._dict_bytes({})
            )
            chunks.append(self._chunk(b"nSHP", shp_content))

        for lid, lname, lcol in layer_defs:
            attrs = {"_name": lname, "_color": lcol} if lname else {"_color": lcol}
            layr_content = struct.pack("<i", lid) + self._dict_bytes(attrs) + struct.pack("<i", -1)
            chunks.append(self._chunk(b"LAYR", layr_content))

        rgba_bytes = b"".join(struct.pack("<BBBB", *c) for c in self.palette)
        chunks.append(self._chunk(b"RGBA", rgba_bytes))

        main_chunk = self._chunk(b"MAIN", b"", b"".join(chunks))
        Path(filename).parent.mkdir(parents=True, exist_ok=True)
        with open(filename, "wb") as f:
            f.write(struct.pack("<4si", b"VOX ", 150))
            f.write(main_chunk)


def build_base_humanoid(
    v: CharacterVoxBuilder,
    skin_light: Tuple[int, int, int],
    skin_dark: Tuple[int, int, int],
    blush: Tuple[int, int, int],
    brow_col: Tuple[int, int, int],
    eye_dark: Tuple[int, int, int],
    eye_light: Tuple[int, int, int],
    hair_bright: Tuple[int, int, int],
    hair_mid: Tuple[int, int, int],
    hair_dark: Tuple[int, int, int],
    pauldron_main: Tuple[int, int, int],
    pauldron_trim: Tuple[int, int, int],
    glove_main: Tuple[int, int, int],
    glove_cuff: Tuple[int, int, int],
    torso_main: Tuple[int, int, int],
    torso_shade: Tuple[int, int, int],
    belt_col: Tuple[int, int, int],
    buckle_col: Tuple[int, int, int],
    boot_upper: Tuple[int, int, int],
    boot_sole: Tuple[int, int, int],
    boot_trim: Tuple[int, int, int],
):
    """Populates the base proportions matching character2.vox in global coordinates."""
    v.set_color(1, *skin_light)
    v.set_color(2, *skin_dark)
    v.set_color(3, *blush)
    v.set_color(4, *brow_col)
    v.set_color(5, 255, 255, 255)
    v.set_color(6, *eye_dark)
    v.set_color(7, *eye_light)
    v.set_color(9, *hair_bright)
    v.set_color(10, *hair_mid)
    v.set_color(11, *hair_dark)
    v.set_color(12, *glove_cuff)
    v.set_color(26, *pauldron_main)
    v.set_color(27, *pauldron_trim)
    v.set_color(28, *glove_main)
    v.set_color(29, *boot_sole)
    v.set_color(30, *buckle_col)
    v.set_color(31, *belt_col)
    v.set_color(32, *boot_upper)
    v.set_color(33, *boot_trim)
    v.set_color(41, *torso_main)
    v.set_color(42, *torso_shade)

    # 1. Pauldrons: Shoulder_right (_t = -7, 0, 11) and Shoulder_left (_t = 7, 0, 11)
    v.fill_box("Shoulder_right", -9, -5, -3, 3, 10, 12, 26)
    v.fill_box("Shoulder_right", -8, -5, -2, 2, 13, 13, 27)

    v.fill_box("Shoulder_left", 5, 9, -3, 3, 10, 12, 26)
    v.fill_box("Shoulder_left", 5, 8, -2, 2, 13, 13, 27)

    # 2. Hands / Forearms: Right_Arm_Hand (_t = -7, 0, 6) and Left_Arm_Hand (_t = 8, 0, 6)
    for part, cx in (("Right_Arm_Hand", -7.0), ("Left_Arm_Hand", 8.0)):
        x0, x1 = int(cx - 2.5), int(cx + 2.5)
        v.fill_box(part, x0 + 1, x1 - 1, -2, 1, 4, 7, 28)
        v.fill_box(part, x0 + 2, x1 - 2, -1, 0, 3, 3, 12)
        v.fill_box(part, x0 + 2, x1 - 2, -1, 0, 8, 8, 12)
        v.fill_box(part, x0 + 2, x1 - 2, -3, -3, 5, 6, 12)
        v.fill_box(part, x0 + 2, x1 - 2, 2, 2, 5, 6, 12)
        v.fill_box(part, x0, x0, -1, 0, 5, 6, 12)
        v.fill_box(part, x1, x1, -1, 0, 5, 6, 12)

    # 3. Torso_Body (_t = 0, -1, 8, size 9x7x9 -> x=[-4..4], y=[-4..2], z=[4..12])
    v.fill_box("Torso_Body", -4, 4, -3, 2, 4, 12, 42)
    v.fill_box("Torso_Body", -3, 3, -3, 2, 4, 12, 41)
    # Belt at z=7..8
    v.fill_box("Torso_Body", -4, 4, -3, 2, 7, 8, 31)
    # Belt buckle at front (y=-4..-3, x=-1..1, z=7..9)
    v.fill_box("Torso_Body", -1, 1, -4, -3, 7, 9, 30)

    # 4. Feet / Boots: Right_Foot (_t = 4, 0, 2) and Left_Foot (_t = -3, 0, 2)
    for part, x0, x1 in (("Right_Foot", 2, 5), ("Left_Foot", -5, -2)):
        v.fill_box(part, x0, x1, -3, 2, 0, 0, 29)
        v.fill_box(part, x0, x1, -3, 2, 1, 2, 32)
        v.fill_box(part, x0, x1, -2, 2, 3, 3, 33)

    # 5. Base Head_Hair_Ears (_t = 0, 1, 19 -> head core x=[-5..5], y=[-4..5], z=[13..25])
    # Core skull & face (face is at y = -4, back of head is at y = +5)
    v.fill_box("Head_Hair_Ears", -4, 4, -4, 4, 13, 20, 1)
    v.fill_box("Head_Hair_Ears", -5, -5, -4, 4, 13, 14, 2)
    v.fill_box("Head_Hair_Ears", 5, 5, -4, 4, 13, 14, 2)
    # Blush at y = -4, z = 14
    v.fill_box("Head_Hair_Ears", -4, -3, -4, -4, 14, 14, 3)
    v.fill_box("Head_Hair_Ears", 3, 4, -4, -4, 14, 14, 3)
    # Eyes at y = -4, z = 15..17
    for sx in (-1, 1):
        # Outer sclera (x = -4 or +4)
        v.fill_box("Head_Hair_Ears", sx * 4, sx * 4, -4, -4, 15, 17, 5)
        # Iris bottom (z = 15: bright) and upper (z = 16..17: dark)
        ix0, ix1 = (-3, -2) if sx < 0 else (2, 3)
        v.fill_box("Head_Hair_Ears", ix0, ix1, -4, -4, 15, 15, 7)
        v.fill_box("Head_Hair_Ears", ix0, ix1, -4, -4, 16, 17, 6)
        # Eyebrows at z = 18
        v.fill_box("Head_Hair_Ears", -4 if sx < 0 else 2, -2 if sx < 0 else 4, -4, -4, 18, 18, 4)

    # Base hair cap & sideburns
    v.fill_box("Head_Hair_Ears", -6, -5, -4, 4, 15, 21, 9)
    v.fill_box("Head_Hair_Ears", 5, 6, -4, 4, 15, 21, 9)
    v.fill_box("Head_Hair_Ears", -6, 6, 4, 5, 14, 23, 10)
    v.fill_box("Head_Hair_Ears", -5, 5, 6, 6, 15, 21, 11)
    v.fill_box("Head_Hair_Ears", -6, 6, -4, 5, 21, 23, 10)
    v.fill_box("Head_Hair_Ears", -5, 5, -4, 4, 24, 24, 9)
    v.fill_box("Head_Hair_Ears", -3, 3, -3, 3, 25, 25, 9)
    # Forehead bangs at y = -5
    v.fill_box("Head_Hair_Ears", -6, 6, -5, -5, 21, 23, 9)
    v.fill_box("Head_Hair_Ears", -5, 5, -5, -5, 20, 20, 9)
    v.fill_box("Head_Hair_Ears", -2, 1, -5, -5, 18, 19, 9)


def generate_ranger() -> CharacterVoxBuilder:
    """character3: Woodland Elf Ranger with long pointed elf ears, silver-blonde hair, circlet & ranger cloak/tunic."""
    v = CharacterVoxBuilder()
    build_base_humanoid(
        v,
        skin_light=(252, 210, 178),
        skin_dark=(232, 180, 144),
        blush=(240, 148, 132),
        brow_col=(90, 75, 55),
        eye_dark=(18, 132, 68),     # Emerald green eyes
        eye_light=(68, 212, 118),
        hair_bright=(242, 238, 218), # Silver-champagne elf hair
        hair_mid=(216, 208, 184),
        hair_dark=(182, 172, 146),
        pauldron_main=(46, 108, 54), # Forest green hunter mantle
        pauldron_trim=(198, 156, 58),# Gold ranger trim
        glove_main=(96, 62, 38),     # Brown leather bracers
        glove_cuff=(64, 40, 24),
        torso_main=(42, 104, 52),    # Forest green tunic
        torso_shade=(28, 74, 36),
        belt_col=(88, 54, 32),       # Leather belt
        buckle_col=(236, 188, 52),   # Gold clasp
        boot_upper=(96, 62, 38),
        boot_sole=(48, 30, 18),
        boot_trim=(46, 108, 54),
    )
    v.set_color(43, 38, 142, 68)     # Emerald circlet gem
    v.set_color(44, 224, 182, 62)    # Gold circlet band

    # Long swept-back pointed Elven Ears (x = -9..-7 and +7..+9, z = 16..18)
    for sx in (-1, 1):
        v.fill_box("Head_Hair_Ears", sx * 7, sx * 8, -1, 1, 16, 17, 2)
        v.fill_box("Head_Hair_Ears", sx * 8, sx * 9, 0, 2, 17, 18, 1)

    # Golden Elven Circlet with center emerald gem on brow (y = -5, z = 20)
    v.fill_box("Head_Hair_Ears", -5, 5, -5, -5, 20, 20, 44)
    v.fill_box("Head_Hair_Ears", -1, 1, -5, -5, 20, 21, 43)

    # Long braided ranger ponytail down the back of the head (y = 6..7, z = 11..19)
    v.fill_box("Head_Hair_Ears", -2, 2, 6, 7, 13, 19, 10)
    v.fill_box("Head_Hair_Ears", -1, 1, 6, 7, 10, 12, 9)
    v.fill_box("Head_Hair_Ears", -1, 1, 6, 7, 13, 13, 44)  # Gold hair tie

    # Diagonal leather archer's baldric strap across chest (Torso_Body)
    for i in range(-3, 4):
        v.set_voxel("Torso_Body", i, -3, 9 + (i // 2), 31)
        v.set_voxel("Torso_Body", i, -3, 10 + (i // 2), 31)
    return v


def generate_paladin() -> CharacterVoxBuilder:
    """character4: Ironbeard Paladin with copper-red hair, full braided beard, winged gold crown & plate armor."""
    v = CharacterVoxBuilder()
    build_base_humanoid(
        v,
        skin_light=(250, 204, 172),
        skin_dark=(226, 174, 140),
        blush=(234, 142, 126),
        brow_col=(148, 52, 22),
        eye_dark=(186, 118, 16),     # Amber-gold eyes
        eye_light=(248, 192, 48),
        hair_bright=(214, 82, 32),   # Fiery copper-auburn hair & beard
        hair_mid=(178, 62, 22),
        hair_dark=(138, 44, 14),
        pauldron_main=(188, 198, 214),# Polished silver-steel pauldrons
        pauldron_trim=(238, 188, 46), # Gilded paladin trim
        glove_main=(164, 174, 192),   # Steel gauntlets
        glove_cuff=(238, 188, 46),
        torso_main=(188, 198, 214),   # Silver breastplate
        torso_shade=(32, 82, 178),    # Royal sapphire tabard sides
        belt_col=(72, 48, 32),
        buckle_col=(244, 196, 52),
        boot_upper=(164, 174, 192),
        boot_sole=(52, 58, 72),
        boot_trim=(238, 188, 46),
    )
    v.set_color(43, 244, 196, 52)    # Gold crown / sun emblem
    v.set_color(44, 32, 82, 178)     # Royal blue tabard

    # Sculpted Mustache & Full Braided Beard on front of face (y = -5..-4, z = 9..15)
    v.fill_box("Head_Hair_Ears", -4, 4, -5, -4, 13, 14, 9)   # Mustache & upper beard
    v.fill_box("Head_Hair_Ears", -1, 1, -4, -4, 14, 14, 1)   # Nose bridge above mustache
    v.fill_box("Head_Hair_Ears", -3, 3, -5, -4, 11, 12, 10)  # Mid beard
    v.fill_box("Head_Hair_Ears", -2, 2, -5, -4, 9, 10, 9)    # Twin beard braids
    v.fill_box("Head_Hair_Ears", -2, -1, -5, -5, 10, 10, 43) # Gold beard rings
    v.fill_box("Head_Hair_Ears", 1, 2, -5, -5, 10, 10, 43)

    # Winged Golden Paladin Coronet around brow (z = 21..23, y = -6)
    v.fill_box("Head_Hair_Ears", -5, 5, -6, -5, 21, 21, 43)
    v.fill_box("Head_Hair_Ears", -1, 1, -6, -5, 22, 23, 43)
    v.fill_box("Head_Hair_Ears", -6, -6, -5, -4, 22, 23, 43)
    v.fill_box("Head_Hair_Ears", 6, 6, -5, -4, 22, 23, 43)

    # Golden sun-cross crest on chest (Torso_Body)
    v.fill_box("Torso_Body", 0, 0, -3, -3, 9, 12, 43)
    v.fill_box("Torso_Body", -2, 2, -3, -3, 11, 11, 43)
    return v


def generate_mage() -> CharacterVoxBuilder:
    """character5: Arcane Sorceress with lavender hair, pointed witch/mage hat with cyan crystal & arcane robes."""
    v = CharacterVoxBuilder()
    build_base_humanoid(
        v,
        skin_light=(255, 224, 206),
        skin_dark=(238, 198, 178),
        blush=(248, 162, 172),
        brow_col=(88, 52, 122),
        eye_dark=(136, 38, 196),     # Amethyst-violet eyes
        eye_light=(214, 108, 255),
        hair_bright=(216, 182, 248), # Soft lavender-violet hair
        hair_mid=(184, 144, 226),
        hair_dark=(146, 106, 192),
        pauldron_main=(74, 38, 124), # Arcane royal purple mantle
        pauldron_trim=(238, 192, 62),# Gold rune trim
        glove_main=(48, 26, 86),
        glove_cuff=(238, 192, 62),
        torso_main=(74, 38, 124),    # Arcane purple robe
        torso_shade=(48, 24, 84),
        belt_col=(238, 192, 62),     # Gold sash
        buckle_col=(64, 232, 255),   # Glowing cyan mana crystal buckle
        boot_upper=(58, 30, 98),
        boot_sole=(32, 18, 56),
        boot_trim=(238, 192, 62),
    )
    v.set_color(43, 48, 24, 84)      # Deep witch/mage hat indigo
    v.set_color(44, 74, 38, 124)     # Mid mage hat purple
    v.set_color(45, 238, 192, 62)    # Gold hat band
    v.set_color(46, 64, 232, 255)    # Glowing cyan mana gem

    # Front hair side-locks framing the face (x = -5..-4 and 4..5, y = -5, z = 11..15)
    for sx in (-1, 1):
        v.fill_box("Head_Hair_Ears", sx * 5, sx * 6, -5, -4, 11, 15, 9)

    # Wide Sculpted Mage Hat Brim (z = 23..24, x = -9..9, y = -8..8) + Pointed Crown (z = 25..32)
    v.fill_box("Head_Hair_Ears", -9, 9, -8, 8, 23, 23, 43)
    v.fill_box("Head_Hair_Ears", -8, 8, -7, 7, 24, 24, 44)
    # Gold hat ribbon & glowing cyan crystal at front of crown (z = 25)
    v.fill_box("Head_Hair_Ears", -6, 6, -5, 5, 25, 25, 45)
    v.fill_box("Head_Hair_Ears", -1, 1, -6, -5, 25, 26, 46)
    # Tapered pointed hat cone tilting slightly back (+Y)
    v.fill_box("Head_Hair_Ears", -5, 5, -4, 5, 26, 27, 44)
    v.fill_box("Head_Hair_Ears", -4, 4, -2, 6, 28, 29, 43)
    v.fill_box("Head_Hair_Ears", -2, 2, 0, 7, 30, 31, 44)
    v.fill_box("Head_Hair_Ears", -1, 1, 3, 8, 32, 32, 45)
    return v


def generate_rogue() -> CharacterVoxBuilder:
    """character6: Crimson Shinobi / Shadow Rogue with spiky silver-black hair, face mask & crimson headband."""
    v = CharacterVoxBuilder()
    build_base_humanoid(
        v,
        skin_light=(242, 198, 166),
        skin_dark=(214, 168, 136),
        blush=(214, 168, 136),
        brow_col=(32, 34, 42),
        eye_dark=(176, 22, 38),      # Crimson-ruby eyes
        eye_light=(248, 64, 78),
        hair_bright=(224, 230, 242), # Spiky silver-white hair
        hair_mid=(186, 194, 210),
        hair_dark=(142, 150, 168),
        pauldron_main=(34, 38, 48),  # Obsidian stealth shoulder guards
        pauldron_trim=(196, 28, 38), # Crimson trim
        glove_main=(34, 38, 48),
        glove_cuff=(196, 28, 38),
        torso_main=(38, 42, 54),     # Dark slate shinobi gi
        torso_shade=(24, 26, 34),
        belt_col=(196, 28, 38),      # Crimson waist sash
        buckle_col=(214, 220, 230),  # Silver shuriken buckle
        boot_upper=(34, 38, 48),
        boot_sole=(20, 22, 28),
        boot_trim=(196, 28, 38),
    )
    v.set_color(43, 28, 32, 42)      # Dark cloth ninja mask
    v.set_color(44, 196, 28, 38)     # Crimson shinobi headband & scarf

    # Dark cloth ninja mask covering lower face & nose (y = -5..-4, z = 13..15)
    v.fill_box("Head_Hair_Ears", -4, 4, -5, -4, 13, 14, 43)
    v.fill_box("Head_Hair_Ears", -2, 2, -5, -4, 15, 15, 43)

    # Crimson headband across brow (z = 19..20) with fluttering tails behind head (y = 6..8)
    v.fill_box("Head_Hair_Ears", -6, 6, -5, 5, 19, 20, 44)
    v.fill_box("Head_Hair_Ears", -2, 0, 6, 8, 18, 19, 44)
    v.fill_box("Head_Hair_Ears", 1, 3, 6, 8, 16, 17, 44)

    # Spiky swept-up anime/voxel hair tufts on top of crown (z = 25..27)
    v.fill_box("Head_Hair_Ears", -5, -2, -3, 2, 25, 26, 9)
    v.fill_box("Head_Hair_Ears", 2, 5, -2, 3, 25, 26, 9)
    v.fill_box("Head_Hair_Ears", -1, 2, 0, 5, 26, 27, 10)
    return v


def generate_necromancer() -> CharacterVoxBuilder:
    """character7: Dread Necromancer with bone skull visage, dark hood, bone shoulder spikes & fel-green soul gem."""
    v = CharacterVoxBuilder()
    build_base_humanoid(
        v,
        skin_light=(214, 218, 224),  # Pale ashen skin
        skin_dark=(178, 184, 194),
        blush=(164, 152, 174),
        brow_col=(36, 28, 48),
        eye_dark=(18, 176, 64),      # Glowing fel-green eyes
        eye_light=(96, 255, 118),
        hair_bright=(42, 32, 56),    # Deep shadow-violet cowl
        hair_mid=(30, 22, 42),
        hair_dark=(20, 14, 28),
        pauldron_main=(42, 32, 56),  # Dark cultist mantle
        pauldron_trim=(228, 222, 204),# Bone pauldron spikes
        glove_main=(32, 26, 44),
        glove_cuff=(228, 222, 204),
        torso_main=(42, 32, 56),     # Dark necromancer robe
        torso_shade=(24, 18, 34),
        belt_col=(118, 22, 42),      # Blood-crimson sash
        buckle_col=(72, 255, 112),   # Glowing soul-emerald clasp
        boot_upper=(32, 26, 44),
        boot_sole=(18, 14, 24),
        boot_trim=(228, 222, 204),
    )
    v.set_color(43, 236, 230, 212)   # Bleached skull bone
    v.set_color(44, 198, 190, 170)   # Aged bone shade
    v.set_color(45, 72, 255, 112)    # Fel soul crystal

    # Sculpted bone half-skull mask & brow crest under the dark cowl
    v.fill_box("Head_Hair_Ears", -4, 4, -5, -5, 19, 21, 43)
    v.fill_box("Head_Hair_Ears", 0, 0, -5, -5, 16, 20, 43)   # Nasal bone bridge
    v.fill_box("Head_Hair_Ears", -4, -4, -5, -5, 14, 18, 44) # Cheekbones
    v.fill_box("Head_Hair_Ears", 4, 4, -5, -5, 14, 18, 44)
    v.fill_box("Head_Hair_Ears", -3, 3, -5, -5, 13, 14, 43)  # Upper jaw teeth
    for tx in (-2, 0, 2):
        v.set_voxel("Head_Hair_Ears", tx, -5, 13, 44)

    # Peaked Necromancer Hood with glowing fel gem at crown (z = 24..27)
    v.fill_box("Head_Hair_Ears", -6, 6, -6, 5, 22, 24, 10)
    v.fill_box("Head_Hair_Ears", -4, 4, -5, 6, 25, 26, 9)
    v.fill_box("Head_Hair_Ears", -2, 2, -2, 7, 27, 27, 11)
    v.fill_box("Head_Hair_Ears", -1, 1, -6, -6, 22, 23, 45)

    # Curved bone spikes rising from both shoulder pauldrons
    v.fill_box("Shoulder_right", -9, -8, -1, 1, 13, 15, 43)
    v.fill_box("Shoulder_left", 8, 9, -1, 1, 13, 15, 43)

    # Bone ribcage motif on chest
    for rz in (9, 11):
        v.fill_box("Torso_Body", -3, 3, -3, -3, rz, rz, 43)
    v.fill_box("Torso_Body", 0, 0, -3, -3, 9, 12, 44)
    return v


def generate_valkyrie() -> CharacterVoxBuilder:
    """character8: Celestial Valkyrie with winged golden-silver helm, twin blonde braids & sky-blue crystal armor."""
    v = CharacterVoxBuilder()
    build_base_humanoid(
        v,
        skin_light=(255, 218, 190),
        skin_dark=(234, 192, 162),
        blush=(248, 156, 152),
        brow_col=(186, 138, 42),
        eye_dark=(24, 118, 214),     # Celestial sapphire eyes
        eye_light=(96, 196, 255),
        hair_bright=(255, 224, 92),  # Radiant golden-blonde hair
        hair_mid=(232, 192, 58),
        hair_dark=(196, 154, 38),
        pauldron_main=(238, 242, 250),# Pearl-silver celestial plate
        pauldron_trim=(248, 202, 64), # Gold trim
        glove_main=(228, 234, 244),
        glove_cuff=(248, 202, 64),
        torso_main=(238, 242, 250),   # White-silver cuirass
        torso_shade=(48, 124, 212),   # Sky-blue side tunic
        belt_col=(248, 202, 64),
        buckle_col=(82, 224, 255),    # Sky crystal buckle
        boot_upper=(228, 234, 244),
        boot_sole=(148, 156, 172),
        boot_trim=(248, 202, 64),
    )
    v.set_color(43, 248, 250, 255)   # Pure white feather wings
    v.set_color(44, 214, 224, 240)   # Silver wing shading
    v.set_color(45, 248, 202, 64)    # Gold diadem
    v.set_color(46, 82, 224, 255)    # Aether cyan gem

    # Golden Valkyrie circlet / nasal guard on brow (y = -5, z = 19..22)
    v.fill_box("Head_Hair_Ears", -5, 5, -5, -5, 20, 21, 45)
    v.fill_box("Head_Hair_Ears", -1, 1, -5, -5, 19, 22, 46)

    # Swept-back Feathered Valkyrie Helm Wings on left & right of head (x = -8..-7 and 7..8)
    for sx in (-1, 1):
        v.fill_box("Head_Hair_Ears", sx * 7, sx * 7, -3, 1, 19, 23, 44)
        v.fill_box("Head_Hair_Ears", sx * 8, sx * 8, -1, 3, 21, 26, 43)
        v.fill_box("Head_Hair_Ears", sx * 8, sx * 8, 1, 5, 24, 28, 43)

    # Twin golden braided pigtails hanging behind shoulders (x = -4..-3 and 3..4, y = 5..6, z = 10..15)
    for sx in (-1, 1):
        v.fill_box("Head_Hair_Ears", sx * 4, sx * 3, 5, 6, 10, 15, 9)
        v.fill_box("Head_Hair_Ears", sx * 4, sx * 3, 5, 6, 11, 11, 46)
    return v


def generate_berserker() -> CharacterVoxBuilder:
    """character9: Frostwolf Viking Berserker with curved horned helm, warpaint, braided beard & wolf-fur pauldrons."""
    v = CharacterVoxBuilder()
    build_base_humanoid(
        v,
        skin_light=(238, 188, 154),
        skin_dark=(208, 156, 124),
        blush=(198, 132, 112),
        brow_col=(58, 38, 26),
        eye_dark=(196, 98, 18),      # Fierce wolf-amber eyes
        eye_light=(255, 178, 52),
        hair_bright=(92, 62, 42),    # Dark brown/chestnut hair & beard
        hair_mid=(68, 44, 28),
        hair_dark=(48, 30, 18),
        pauldron_main=(138, 144, 154),# Grey wolf-pelt fur pauldrons
        pauldron_trim=(98, 104, 114),
        glove_main=(104, 68, 42),    # Studded leather gauntlets
        glove_cuff=(148, 154, 166),
        torso_main=(118, 78, 48),    # Leather harness & fur vest
        torso_shade=(78, 50, 30),
        belt_col=(62, 40, 24),
        buckle_col=(184, 190, 202),  # Iron skull/ring buckle
        boot_upper=(92, 60, 36),
        boot_sole=(44, 28, 18),
        boot_trim=(138, 144, 154),   # Fur boot tops
    )
    v.set_color(43, 98, 106, 118)    # Forged iron helmet
    v.set_color(44, 236, 228, 204)   # Ivory horn base
    v.set_color(45, 198, 186, 156)   # Horn tip shade
    v.set_color(46, 36, 124, 214)    # Woad blue warpaint

    # Woad-blue Viking warpaint stripe across right eye (x = -4..-2, y = -4, z = 14..19)
    v.fill_box("Head_Hair_Ears", -4, -2, -4, -4, 14, 14, 46)
    v.fill_box("Head_Hair_Ears", -4, -2, -4, -4, 18, 19, 46)

    # Rugged Viking Goatee & Mustache (y = -5..-4, z = 11..14)
    v.fill_box("Head_Hair_Ears", -3, 3, -5, -4, 13, 14, 9)
    v.fill_box("Head_Hair_Ears", -2, 2, -5, -4, 11, 12, 10)

    # Iron Spangenhelm Dome (z = 20..25) + Nose Guard
    v.fill_box("Head_Hair_Ears", -6, 6, -5, 5, 20, 23, 43)
    v.fill_box("Head_Hair_Ears", -5, 5, -4, 4, 24, 25, 43)
    v.fill_box("Head_Hair_Ears", 0, 0, -5, -5, 16, 20, 43)

    # Curved Bull/Viking Horns sweeping outward and upward (x = -10..-7 and 7..10, z = 21..27)
    for sx in (-1, 1):
        v.fill_box("Head_Hair_Ears", sx * 8, sx * 7, -2, 1, 21, 23, 44)
        v.fill_box("Head_Hair_Ears", sx * 10, sx * 8, -2, 1, 23, 25, 44)
        v.fill_box("Head_Hair_Ears", sx * 10, sx * 9, -1, 0, 26, 27, 45)
    return v


def generate_monk() -> CharacterVoxBuilder:
    """character10: Sun-Temple Monk with wide woven bamboo kasa hat, saffron robes & crimson prayer beads."""
    v = CharacterVoxBuilder()
    build_base_humanoid(
        v,
        skin_light=(236, 186, 148),
        skin_dark=(206, 156, 118),
        blush=(218, 136, 118),
        brow_col=(42, 34, 28),
        eye_dark=(168, 104, 18),     # Calm golden-brown eyes
        eye_light=(242, 184, 54),
        hair_bright=(48, 40, 36),    # Dark ink hair
        hair_mid=(34, 28, 24),
        hair_dark=(22, 18, 16),
        pauldron_main=(236, 132, 28),# Saffron-orange monk mantle
        pauldron_trim=(148, 32, 32), # Crimson kasaya trim
        glove_main=(238, 230, 214),  # White cloth hand wraps
        glove_cuff=(148, 32, 32),
        torso_main=(236, 132, 28),   # Saffron monk gi
        torso_shade=(148, 32, 32),   # Deep maroon inner robe
        belt_col=(148, 32, 32),      # Crimson sash
        buckle_col=(244, 198, 62),   # Brass lotus clasp
        boot_upper=(238, 230, 214),  # Cloth leg wraps
        boot_sole=(88, 58, 34),      # Woven straw sandals
        boot_trim=(148, 32, 32),
    )
    v.set_color(43, 218, 182, 106)   # Woven golden bamboo straw (light)
    v.set_color(44, 186, 148, 76)    # Woven bamboo straw (mid)
    v.set_color(45, 148, 32, 32)     # Crimson cord / prayer beads

    # Wide Conical Woven Bamboo Kasa Hat (z = 22..28, x = -10..10, y = -9..9)
    v.fill_box("Head_Hair_Ears", -10, 10, -9, 9, 22, 22, 44)
    v.fill_box("Head_Hair_Ears", -8, 8, -7, 7, 23, 24, 43)
    v.fill_box("Head_Hair_Ears", -6, 6, -5, 5, 25, 25, 45)  # Crimson cord ring
    v.fill_box("Head_Hair_Ears", -4, 4, -3, 3, 26, 27, 43)
    v.fill_box("Head_Hair_Ears", -2, 2, -1, 1, 28, 28, 44)

    # Monk's ring of large prayer beads draped across the chest (Torso_Body)
    for bx, bz in ((-3, 12), (-2, 11), (-1, 10), (0, 10), (1, 10), (2, 11), (3, 12)):
        v.set_voxel("Torso_Body", bx, -3, bz, 45)
    return v


def generate_druid() -> CharacterVoxBuilder:
    """character11: Wildwood Druid with tall branching stag antlers, mossy green hair & living bark armor."""
    v = CharacterVoxBuilder()
    build_base_humanoid(
        v,
        skin_light=(238, 194, 162),
        skin_dark=(208, 164, 132),
        blush=(224, 142, 128),
        brow_col=(38, 88, 44),
        eye_dark=(22, 148, 82),      # Glowing emerald-viridian eyes
        eye_light=(92, 244, 142),
        hair_bright=(58, 138, 64),   # Mossy emerald hair
        hair_mid=(42, 106, 48),
        hair_dark=(28, 78, 34),
        pauldron_main=(96, 64, 38),  # Ancient oak bark pauldrons
        pauldron_trim=(72, 168, 58), # Living leaf trim
        glove_main=(82, 54, 32),
        glove_cuff=(72, 168, 58),
        torso_main=(88, 58, 34),     # Bark & vine chestpiece
        torso_shade=(42, 106, 48),
        belt_col=(72, 168, 58),      # Woven vine belt
        buckle_col=(255, 196, 48),   # Glowing amber heartstone
        boot_upper=(82, 54, 32),
        boot_sole=(48, 32, 18),
        boot_trim=(72, 168, 58),
    )
    v.set_color(43, 138, 96, 58)     # Stag antler wood (light)
    v.set_color(44, 102, 68, 38)     # Stag antler base (dark)
    v.set_color(45, 112, 218, 78)    # Spring leaf buds

    # Tall Branching Stag Antlers rising from the brow/crown (x = -9..-4 and 4..9, z = 24..32)
    for sx in (-1, 1):
        # Main beam rising and sweeping outward
        v.fill_box("Head_Hair_Ears", sx * 5, sx * 4, -2, 0, 24, 26, 44)
        v.fill_box("Head_Hair_Ears", sx * 7, sx * 6, -2, 0, 26, 29, 43)
        v.fill_box("Head_Hair_Ears", sx * 9, sx * 8, -1, 1, 29, 32, 43)
        # Inner brow tine
        v.fill_box("Head_Hair_Ears", sx * 4, sx * 3, -3, -2, 27, 29, 43)
        # Sprouting spring leaves on antler tips
        v.set_voxel("Head_Hair_Ears", sx * 9, 0, 32, 45)
        v.set_voxel("Head_Hair_Ears", sx * 6, -2, 29, 45)
    return v


def generate_pirate() -> CharacterVoxBuilder:
    """character12: Swashbuckler Pirate Captain with black & gold tricorne hat, scarlet plume, eyepatch & crimson coat."""
    v = CharacterVoxBuilder()
    build_base_humanoid(
        v,
        skin_light=(240, 192, 156),
        skin_dark=(210, 162, 126),
        blush=(218, 138, 122),
        brow_col=(48, 32, 22),
        eye_dark=(82, 54, 32),       # Dark brown eyes
        eye_light=(148, 102, 64),
        hair_bright=(68, 46, 32),    # Dark espresso-brown hair & beard
        hair_mid=(48, 32, 22),
        hair_dark=(32, 20, 14),
        pauldron_main=(168, 24, 34), # Crimson admiral coat shoulders
        pauldron_trim=(244, 196, 52),# Gold bullion epaulets
        glove_main=(62, 40, 26),     # Dark leather cuffs
        glove_cuff=(244, 196, 52),
        torso_main=(168, 24, 34),    # Crimson captain coat
        torso_shade=(112, 16, 24),
        belt_col=(52, 34, 22),
        buckle_col=(244, 196, 52),   # Brass buckle
        boot_upper=(52, 34, 22),     # Tall cavalier boots
        boot_sole=(28, 18, 12),
        boot_trim=(244, 196, 52),
    )
    v.set_color(43, 28, 30, 38)      # Black tricorne felt & eyepatch
    v.set_color(44, 244, 196, 52)    # Gold tricorne trim
    v.set_color(45, 228, 36, 48)     # Scarlet feather plume & bandana

    # Black Pirate Eyepatch over left eye (x = 2..4, y = -4, z = 15..17) + diagonal strap
    v.fill_box("Head_Hair_Ears", 2, 4, -4, -4, 15, 17, 43)
    v.set_voxel("Head_Hair_Ears", 1, -4, 18, 43)
    v.set_voxel("Head_Hair_Ears", 5, -4, 18, 43)

    # Scruffy Captain Beard & Mustache (y = -5..-4, z = 12..14)
    v.fill_box("Head_Hair_Ears", -4, 4, -5, -4, 13, 13, 9)
    v.fill_box("Head_Hair_Ears", -2, 2, -5, -4, 12, 12, 10)

    # Red bandana under hat (z = 20..21)
    v.fill_box("Head_Hair_Ears", -6, 6, -5, 5, 20, 21, 45)

    # Wide Tricorne Pirate Hat with Gold Trim (z = 22..26, x = -9..9, y = -8..7) + Scarlet Plume
    v.fill_box("Head_Hair_Ears", -9, 9, -6, 6, 22, 24, 43)
    v.fill_box("Head_Hair_Ears", -5, 5, -8, -6, 22, 24, 43)
    v.fill_box("Head_Hair_Ears", -9, 9, -6, 6, 25, 25, 44)
    v.fill_box("Head_Hair_Ears", -5, 5, -8, -6, 25, 25, 44)
    # Scarlet feather plume sweeping back on the left side of the hat
    v.fill_box("Head_Hair_Ears", 5, 7, -3, 4, 26, 28, 45)
    return v


PRESETS = {
    "character3": ("ranger", generate_ranger),
    "character4": ("paladin", generate_paladin),
    "character5": ("mage", generate_mage),
    "character6": ("rogue", generate_rogue),
    "character7": ("necromancer", generate_necromancer),
    "character8": ("valkyrie", generate_valkyrie),
    "character9": ("berserker", generate_berserker),
    "character10": ("monk", generate_monk),
    "character11": ("druid", generate_druid),
    "character12": ("pirate", generate_pirate),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--character",
        choices=[*PRESETS.keys(), "all"],
        default="all",
        help="Character preset to generate (default: all)",
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        default="Assets/models/human",
        help="Directory to write .vox files (default: Assets/models/human)",
    )
    args = parser.parse_args()
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    targets = list(PRESETS.keys()) if args.character == "all" else [args.character]
    for key in targets:
        archetype, fn = PRESETS[key]
        builder = fn()
        out_path = out_dir / f"{key}.vox"
        builder.save(str(out_path))
        total_voxels = sum(len(p) for p in builder.parts.values())
        print(f"Saved {key}.vox ({archetype}, {len(PART_NAMES)} parts, {total_voxels} voxels) -> {out_path}")


if __name__ == "__main__":
    main()
