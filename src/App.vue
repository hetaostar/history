<template>
  <div class="app-shell">
    <header class="app-header">
      <span class="brand">历史背诵助手</span>
      <nav class="nav-links">
        <RouterLink to="/">主页</RouterLink>
        <RouterLink to="/people">人物</RouterLink>
        <RouterLink to="/events">事件</RouterLink>
        <RouterLink to="/cards">卡片背诵</RouterLink>
        <RouterLink to="/search">搜索</RouterLink>
        <RouterLink to="/china-river">中华历史长河</RouterLink>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
