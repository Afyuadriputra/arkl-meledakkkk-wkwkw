
| Folder            | Perubahan                 | Keterangan                                                        |
| ----------------- | ------------------------- | ----------------------------------------------------------------- |
| `devices/`      | 🟢 Hampir tidak berubah   | IoT, MQTT, Device, H2SReading tetap                               |
| `exposure/`     | 🟡 Minor–medium          | Worker tetap, ExposureProfile tetap; nantinya link Worker ke User |
| `arkl/`         | 🔴 Perubahan terbesar     | Formula intake ARKL v2                                            |
| `alerts/`       | 🟡 Regression/minor       | Tidak rewrite rule; sesuaikan permission/actor nanti              |
| `research/`     | 🟡 Lanjut setelah ARKL v2 | Reporting harus version-aware                                     |
| `core/`         | 🟢 Pertahankan            | Observability sudah ada                                           |
| `config/`       | 🟡 Update                 | Register app auth, URL, permissions, research URL                 |
| `accounts/`     | 🆕 NEW                    | Authentication + role + ownership                                 |
| `catatan/`      | 🟢 Dokumentasi            | Update specification/status                                       |
| `task/`         | 🟢 Manajemen kerja        | Tidak menjadi runtime architecture                                |
| `logs/`         | 🟢 Jangan diubah          | Output observability                                              |
| `requirements/` | 🟢 kemungkinan tetap      | Django auth bawaan cukup; jangan tambah dependency tanpa perlu    |
