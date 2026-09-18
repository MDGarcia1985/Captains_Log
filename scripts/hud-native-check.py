"""File: hud-native-check.py
Purpose: TASK-007 native QA; captures stay in ignored .tmp/hud-native, no app data reset.
Author: Codex; Contact: michael@mandedesign.studio; SPDX-License-Identifier: MPL-2.0
Decision: DEV-2026-09-14-003. Restore records this emulator session's original settings.
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ADB = Path.home() / 'AppData/Local/Android/Sdk/platform-tools/adb.exe'
OUT = Path(__file__).resolve().parent.parent / '.tmp/hud-native'
OUT.mkdir(parents=True, exist_ok=True)

def adb(*args):
    return subprocess.check_output([str(ADB), '-s', os.environ.get('CAPTAINS_QA_SERIAL', 'emulator-5554'), *args])

action = sys.argv[1]
if action == 'snapshot':
    tag = sys.argv[2]
    assert tag.replace('-', '').isalnum()
    time.sleep(1)
    (OUT / (tag + '.png')).write_bytes(adb('exec-out', 'screencap', '-p'))
    remote = '/sdcard/task007-' + tag + '.xml'
    result = adb('shell', 'uiautomator', 'dump', remote).decode(errors='replace')
    if 'dumped' in result:
        (OUT / (tag + '.xml')).write_bytes(adb('shell', 'cat', remote))
    else:
        print('UI hierarchy unavailable (animation prevented idle); screenshot is valid.')
    info = {name: adb('shell', *cmd).decode(errors='replace') for name, cmd in {
        'size': ['wm', 'size'], 'density': ['wm', 'density'],
        'keyboard': ['dumpsys', 'input_method'], 'window': ['dumpsys', 'window'],
    }.items()}
    (OUT / (tag + '.json')).write_text(json.dumps(info, indent=2))
    logs = adb('logcat', '-d', '-t', '1000', '-s', 'ReactNativeJS').decode(errors='replace')
    (OUT / (tag + '-fit.log')).write_text('\n'.join(line for line in logs.splitlines() if 'HUD_FIT' in line))
    print(OUT / (tag + '.png'))
elif action == 'tap':
    print(adb('shell', 'input', 'tap', str(int(sys.argv[2])), str(int(sys.argv[3]))).decode())
elif action == 'swipe':
    coords = [str(int(x)) for x in sys.argv[2:6]]
    assert len(coords) == 4
    adb('shell', 'input', 'swipe', *coords, '700')
elif action == 'key':
    print(adb('shell', 'input', 'keyevent', str(int(sys.argv[2]))).decode())
elif action == 'motion':
    assert sys.argv[2] in ['0', '1']
    for setting in ['transition_animation_scale', 'animator_duration_scale', 'window_animation_scale']:
        print(setting, adb('shell', 'settings', 'get', 'global', setting).decode().strip())
        adb('shell', 'settings', 'put', 'global', setting, sys.argv[2])
elif action == 'keyboard':
    assert sys.argv[2] in ['0', '1']
    print('show_ime_with_hard_keyboard', adb('shell', 'settings', 'get', 'secure', 'show_ime_with_hard_keyboard').decode().strip())
    adb('shell', 'settings', 'put', 'secure', 'show_ime_with_hard_keyboard', sys.argv[2])
elif action == 'rotate':
    assert sys.argv[2] in ['0', '1']
    adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0')
    adb('shell', 'settings', 'put', 'system', 'user_rotation', sys.argv[2])
elif action == 'connect':
    adb('reverse', 'tcp:8081', 'tcp:8081')
    adb('shell', 'am', 'force-stop', 'com.captainslog.app')
    print(adb('shell', 'am', 'start', '-n', 'com.captainslog.app/.MainActivity').decode())
elif action == 'restore':
    adb('shell', 'settings', 'put', 'system', 'user_rotation', '0')
    adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '1')
    adb('shell', 'settings', 'put', 'global', 'transition_animation_scale', '1.0')
    adb('shell', 'settings', 'delete', 'global', 'animator_duration_scale')
    adb('shell', 'settings', 'put', 'global', 'window_animation_scale', '1.0')
    adb('shell', 'settings', 'put', 'secure', 'show_ime_with_hard_keyboard', '0')
elif action == 'inspect':
    print(adb('shell', 'settings', 'get', 'system', 'accelerometer_rotation').decode())
    print(adb('shell', 'run-as', 'com.captainslog.app', 'ls', 'shared_prefs').decode())
    print(adb('logcat', '-d', '-t', '120', '-s', 'ReactNativeJS', 'ReactNative', 'Expo').decode(errors='replace'))
else:
    raise SystemExit('Expected snapshot, tap, swipe, key, motion, keyboard, rotate, connect, restore, or inspect')
