<template>
  <div class="app-shell">
    <header class="app-header">
      <span class="brand">历史背诵助手</span>
      <nav class="nav-links">
        <RouterLink to="/">主页</RouterLink>
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
