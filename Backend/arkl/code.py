from pathlib import Path

target_files = [
    "models.py",
    "serializers.py",
    "views.py",
    "services/constants.py",
    "services/validation.py",
    "services/rq.py",
    "services/calculator.py",
    "services/exposure_concentration.py",
    "tests/test_exposure_concentration.py",
    "tests/test_rq.py",
    "tests/test_calculator.py",
    "tests/test_models.py",
    "tests/test_api.py",
]

output_filename = "ARKL_CODE_SNAPSHOT.md"
md_content = ["# ARKL Module Code Snapshot\n\n"]

for filepath_str in target_files:
    file_path = Path(filepath_str)
    if file_path.exists():
        content = file_path.read_text(encoding="utf-8")
        md_content.append(f"## `{filepath_str}`\n\n```python\n{content}\n```\n\n")
        print(f"[OK] {filepath_str}")
    else:
        print(f"[LEWAT - Tidak ditemukan] {filepath_str}")

Path(output_filename).write_text("".join(md_content), encoding="utf-8")
print(f"\nSelesai! Hasil tersimpan di: {output_filename}")
