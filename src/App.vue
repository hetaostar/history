<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink to="/" class="brand">历史背诵助手</RouterLink>
      <nav class="nav-links">
        <RouterLink to="/people">人物</RouterLink>
        <RouterLink to="/timelines">时间线</RouterLink>
        <RouterLink to="/cards">卡片背诵</RouterLink>
        <RouterLink to="/search">搜索</RouterLink>
        <RouterLink to="/data">导入导出</RouterLink>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
