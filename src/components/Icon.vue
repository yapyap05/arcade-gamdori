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
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
}
defineProps({ name: { type: String, required: true } })
</script>

<template>
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="PATHS[name]" /></svg>
</template>
