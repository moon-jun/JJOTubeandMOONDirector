# JJO & MOON Director 📺

> YouTube URL들을 `videos.txt`에 추가하면 자동으로 유튜브 스타일 갤러리가 완성됩니다.

## 🚀 사용 방법

### 1. 영상 추가하기

`videos.txt` 파일을 열고 유튜브 주소를 한 줄씩 추가하세요:

```
# 이건 주석 (무시됨)
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/shorts/VIDEO_ID
```

지원 형식:
- `https://www.youtube.com/watch?v=XXXX`
- `https://youtu.be/XXXX`
- `https://www.youtube.com/shorts/XXXX`
- `https://www.youtube.com/embed/XXXX`

### 2. GitHub에 올리기

```bash
git add .
git commit -m "영상 추가"
git push
```

### 3. GitHub Pages 활성화

- GitHub 레포 → **Settings → Pages**
- Source: `Deploy from a branch`
- Branch: `main` / `/(root)` 선택 후 **Save**

몇 초 뒤 `https://<username>.github.io/<repo-name>` 으로 접속 가능!

## ✨ 기능

| 기능 | 설명 |
|------|------|
| 🖼️ 썸네일 미리보기 | YouTube 공식 썸네일 자동 로드 |
| 🔍 검색 | 제목/채널명으로 실시간 검색 |
| 🏷️ 채널 필터 | 채널별로 필터링 |
| ▶️ 인앱 재생 | 클릭하면 사이트 내에서 바로 재생 |
| ⊞ 레이아웃 전환 | 그리드 ↔ 리스트 뷰 |
| 🔤 정렬 | 기본 / 제목 오름차순 / 내림차순 |
| 📱 반응형 | 모바일/태블릿/데스크탑 모두 지원 |

## 🛠️ 기술 스택

- **HTML / CSS / Vanilla JS** (프레임워크 없음)
- **GitHub Pages** 무료 호스팅
- **[noembed.com](https://noembed.com)** 영상 메타데이터 (제목, 채널명)
- **YouTube Thumbnail API** 썸네일 이미지

## 📁 파일 구조

```
├── index.html      # 메인 페이지
├── style.css       # 스타일 (다크 테마)
├── app.js          # 앱 로직
├── videos.txt      # ← 여기에 YouTube URL 추가!
└── README.md
```
