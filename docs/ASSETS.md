# 외부 에셋 출처

그림은 전부 코드로 그림(이미지 에셋 없음). 소리만 외부 에셋을 씀 - 전부 **CC0(퍼블릭 도메인)** 또는 MIT.

## 효과음 (public/sfx/*.mp3)

| 묶음 | 라이선스 | 다운로드 | 쓰는 것 |
|---|---|---|---|
| Kenney - Impact Sounds | CC0 | https://kenney.nl/assets/impact-sounds | 타격(살·뼈·판금), 강타, 피격, 종(전설·신성) |
| Kenney - RPG Audio | CC0 | https://kenney.nl/assets/rpg-audio | 줍기(장비·동전·가죽), 맵 입장(문) |
| Kenney - Interface Sounds | CC0 | https://kenney.nl/assets/interface-sounds | 메뉴 열고 닫기, 카드, 오류, 물약(유리) |
| OpenGameArt - 80 CC0 RPG SFX (rubberduck) | CC0 | https://opengameart.org/content/80-cc0-rpg-sfx | 몬스터 울음·피격·죽음, 화염·주문, 돌, 사슬, 보석 |
| ZzFX (Frank Force) | MIT | https://github.com/KilledByAPixel/ZzFX | 코드 합성: 휘두르기, 마법(번개·냉기·신성), 레벨업 등 (src/audio/zzfx.js) |

- 어떤 원본 파일을 어떤 이름으로 쓰는지: `tools/sfx-sources.json`
- 다시 만들기: 위 묶음을 한 폴더에 `impact/ rpg/ ui/ oga80/`로 풀고 `node tools/sfx-import.mjs <그 폴더>` (ffmpeg 필요 - .ogg → 모노 96kbps .mp3, 아이폰 사파리 호환)
- 게임에서 쓰는 이름·음량·간격: `src/data/sfx.js` / 엔진: `src/audio/sfx.js` / 관리자 페이지 '효과음' 탭에서 들어 보기

## 아직 없는 것 (docs/TODO.md)
- 소 울음(음메) - Freesound CC0 필요(로그인해야 받을 수 있음)
- 배경음악
