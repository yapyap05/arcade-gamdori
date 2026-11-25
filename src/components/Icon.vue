<script setup>
/** 선 아이콘 (24x24, stroke=currentColor). 굵기는 테마 토큰 --stroke */
const PATHS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  rank: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4',
  rec: 'M4 20V10M10 20V4M16 20v-7M2 20h20',
  set: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  sound: 'M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 10l4 4M21 10l-4 4',
  back: 'M15 5l-7 7 7 7',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  rotate: 'M4 12a8 8 0 0 1 14-5.3M18 3v4h-4M20 12a8 8 0 0 1-14 5.3M6 21v-4h4',
  pause: 'M9 5v14M15 5v14',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  up: 'M5 15l7-7 7 7',
  turn: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  drop: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  hold: 'M4 6h16v12H4zM9 12h6',
  ccw: 'M4 4v5h5M5 9a8 8 0 1 1 1.5 8.5',
  cw: 'M20 4v5h-5M19 9a8 8 0 1 0-1.5 8.5',
  swap: 'M5 19L19 5M19 5h-6M19 5v6M5 19h6M5 19v-6',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  fortune: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  plane: 'M21 3L3 10.5l7 2.5 2.5 7zM21 3L10 13',
  mail: 'M3 6h18v12H3zM3 6l9 7 9-7',
  chat: 'M4 5h16v11H9l-5 4z',
  chatDots: 'M4 5h16v11H9l-5 4zM9 10.5h.01M12 10.5h.01M15 10.5h.01',
  pad: 'M7 9h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5.2 2L14 14h-4l-1.8 2A3 3 0 0 1 3 14v-1a4 4 0 0 1 4-4zM8 11.5v3M6.5 13h3M15 12.5h.01M17 14h.01',
  pin: 'M12 16v6M8 3h8l-1 6 3 3H6l3-3z',
  weight: 'M5 20h14l-2-10H7zM9 10a3 3 0 1 1 6 0',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
}
defineProps({ name: { type: String, required: true } })
</script>

<template>
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="PATHS[name]" /></svg>
</template>
