"""Generate a single MP3 dialogue from PM and PO text lines."""

import argparse
import asyncio
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import edge_tts


PM_VOICE = "fr-FR-HenriNeural"
PO_VOICE = "fr-FR-DeniseNeural"
PM_RATE = "+0%"
PO_RATE = "+0%"

PAUSE_SECONDS = "0.6"
PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIRECTORY = PROJECT_ROOT / "audio" / "output"


def parse_dialogue(source_path: Path) -> list[tuple[str, str]]:
    dialogues = []

    try:
        lines = source_path.read_text(encoding="utf-8").splitlines()
    except OSError as error:
        raise ValueError(f"Impossible de lire '{source_path}': {error}") from error

    for line_number, line in enumerate(lines, start=1):
        line = line.strip()
        if not line:
            continue

        speaker, separator, text = line.partition(":")
        speaker = speaker.strip().upper()
        text = text.strip()
        if separator != ":" or speaker not in {"PM", "PO"} or not text:
            raise ValueError(
                f"Ligne {line_number} invalide. Format attendu : PM: texte ou PO: texte."
            )
        dialogues.append((speaker, text))

    if not dialogues:
        raise ValueError("Le fichier ne contient aucune replique exploitable.")

    return dialogues


async def generate_replies(dialogues: list[tuple[str, str]], temporary_directory: Path) -> list[Path]:
    audio_files = []
    for index, (speaker, text) in enumerate(dialogues):
        voice, rate = (PM_VOICE, PM_RATE) if speaker == "PM" else (PO_VOICE, PO_RATE)
        audio_path = temporary_directory / f"reply-{index:03d}.mp3"
        await edge_tts.Communicate(text, voice=voice, rate=rate).save(audio_path)
        audio_files.append(audio_path)
    return audio_files


def combine_replies(audio_files: list[Path], output_path: Path) -> None:
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        raise RuntimeError(
            "FFmpeg est introuvable. Installez-le puis rouvrez le terminal VS Code."
        )

    command = [ffmpeg_path, "-y"]
    filter_inputs = []
    for index, audio_path in enumerate(audio_files):
        command.extend(["-i", str(audio_path)])
        filter_inputs.append(f"[{index}:a]")
        if index < len(audio_files) - 1:
            silence_index = len(audio_files) + index
            command.extend(
                [
                    "-f",
                    "lavfi",
                    "-t",
                    PAUSE_SECONDS,
                    "-i",
                    "anullsrc=r=24000:cl=mono",
                ]
            )
            filter_inputs.append(f"[{silence_index}:a]")

    command.extend(
        [
            "-filter_complex",
            f"{''.join(filter_inputs)}concat=n={len(filter_inputs)}:v=0:a=1[dialogue]",
            "-map",
            "[dialogue]",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "64k",
            str(output_path),
        ]
    )

    completed_process = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed_process.returncode != 0:
        raise RuntimeError(completed_process.stderr.strip() or "FFmpeg n'a pas pu assembler le MP3.")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Genere un MP3 de dialogue a partir de lignes PM: ou PO:."
    )
    parser.add_argument("source", type=Path, help="Fichier texte du dialogue")
    arguments = parser.parse_args()
    source_path = arguments.source.resolve()

    if not source_path.is_file():
        print(f"Erreur : fichier introuvable : {source_path}", file=sys.stderr)
        return 1
    if source_path.suffix.lower() != ".txt":
        print("Erreur : le fichier source doit avoir l'extension .txt.", file=sys.stderr)
        return 1

    try:
        dialogues = parse_dialogue(source_path)
        OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
        output_path = OUTPUT_DIRECTORY / f"{source_path.stem}.mp3"
        with tempfile.TemporaryDirectory(prefix="photo-mystere-audio-") as temporary_directory:
            audio_files = asyncio.run(generate_replies(dialogues, Path(temporary_directory)))
            combine_replies(audio_files, output_path)
    except (RuntimeError, ValueError, edge_tts.exceptions.NoAudioReceived) as error:
        print(f"Erreur : {error}", file=sys.stderr)
        return 1

    print(f"MP3 cree : {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())