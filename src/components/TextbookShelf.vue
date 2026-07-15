<script setup lang="ts">
import type { ITextbook } from '@/domain/textbookTypes'

defineProps<{
  textbooks: readonly ITextbook[]
}>()
</script>

<template>
  <section class="textbook-shelf" aria-labelledby="textbook-shelf-title">
    <div class="shelf-heading">
      <div>
        <p class="shelf-kicker">Textbook collection</p>
        <h2 id="textbook-shelf-title">初中历史教材</h2>
      </div>
      <p>按册进入教材，把人物、事件和课程放回同一段历史中。</p>
    </div>

    <div class="textbook-spines" role="list" aria-label="六册初中历史教材">
      <div
        v-for="textbook in textbooks"
        :key="textbook.id"
        class="textbook-spine"
        :class="{ 'is-coming-soon': textbook.status === 'coming-soon' }"
        role="listitem"
      >
        <RouterLink
          v-if="textbook.status === 'published'"
          class="textbook-spine-link"
          :to="`/textbooks/${textbook.id}`"
          :aria-label="`打开${textbook.title}`"
        >
          <span class="spine-grade">{{ textbook.shortTitle }}</span>
          <strong>{{ textbook.title }}</strong>
          <span class="spine-edition">{{ textbook.edition }}</span>
          <span class="spine-action">进入本册</span>
        </RouterLink>
        <div
          v-else
          class="textbook-spine-coming-soon"
          aria-disabled="true"
          :aria-label="`${textbook.title}，待出版`"
        >
          <span class="spine-grade">{{ textbook.shortTitle }}</span>
          <strong>{{ textbook.title }}</strong>
          <span class="spine-edition">{{ textbook.edition }}</span>
          <span class="spine-action">待出版</span>
        </div>
      </div>
    </div>
    <div class="shelf-board" aria-hidden="true"></div>
  </section>
</template>

<style scoped>
.textbook-shelf {
  padding: clamp(22px, 4vw, 36px);
  overflow: hidden;
  background:
    linear-gradient(90deg, rgb(54 91 76 / 7%) 1px, transparent 1px) 0 0 / 38px
      100%,
    color-mix(in srgb, var(--paper) 88%, white);
  border: 1px solid rgb(74 50 35 / 16%);
  border-radius: 30px;
  box-shadow: 0 18px 45px rgb(36 27 20 / 10%);
}

.shelf-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.shelf-heading > p {
  max-width: 480px;
  margin: 0;
  color: var(--muted-ink);
  line-height: 1.7;
}

.shelf-kicker {
  margin: 0 0 5px;
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(28px, 5vw, 42px);
}

.textbook-spines {
  display: grid;
  grid-template-columns: repeat(6, minmax(125px, 1fr));
  gap: 8px;
  overflow-x: auto;
  scrollbar-color: var(--bronze) transparent;
  scrollbar-width: thin;
}

.textbook-spine {
  min-width: 125px;
  min-height: 290px;
}

.textbook-spine-link,
.textbook-spine-coming-soon {
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: 12px;
  min-height: 100%;
  padding: 18px 14px;
  color: var(--paper);
  text-decoration: none;
  background:
    linear-gradient(
      90deg,
      rgb(255 255 255 / 13%),
      transparent 14%,
      transparent 86%,
      rgb(0 0 0 / 13%)
    ),
    var(--bronze);
  border: 1px solid rgb(36 27 20 / 34%);
  border-radius: 7px 7px 3px 3px;
  box-shadow:
    inset 0 8px 0 rgb(255 248 229 / 12%),
    3px 5px 0 rgb(74 50 35 / 18%);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.textbook-spine:nth-child(even) .textbook-spine-link {
  background:
    linear-gradient(
      90deg,
      rgb(255 255 255 / 13%),
      transparent 14%,
      transparent 86%,
      rgb(0 0 0 / 13%)
    ),
    var(--cinnabar);
}

.textbook-spine-link:hover,
.textbook-spine-link:focus-visible {
  outline: 3px solid var(--cinnabar);
  outline-offset: 3px;
  box-shadow:
    inset 0 8px 0 rgb(255 248 229 / 16%),
    5px 8px 0 rgb(74 50 35 / 20%);
  transform: translateY(-4px);
}

.textbook-spine-coming-soon {
  color: var(--muted-ink);
  background:
    repeating-linear-gradient(
      -45deg,
      transparent 0 10px,
      rgb(74 50 35 / 5%) 10px 20px
    ),
    var(--paper-deep);
  border-style: dashed;
  box-shadow: none;
}

.spine-grade {
  width: fit-content;
  padding: 5px 8px;
  color: var(--ink);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 900;
  background: var(--paper);
  border-radius: 999px;
}

strong {
  align-self: center;
  font-family: var(--font-display);
  font-size: 24px;
  line-height: 1.25;
  writing-mode: vertical-rl;
}

.spine-edition {
  font-size: 11px;
  line-height: 1.4;
}

.spine-action {
  padding-top: 10px;
  font-weight: 900;
  border-top: 1px solid currentColor;
}

.shelf-board {
  height: 16px;
  margin: 0 -12px;
  background: linear-gradient(#8b6244, #5b3c2b);
  border-radius: 3px 3px 9px 9px;
  box-shadow: 0 8px 14px rgb(36 27 20 / 24%);
}

@media (prefers-reduced-motion: reduce) {
  .textbook-spine-link {
    transition: none;
  }
}

@media (max-width: 720px) {
  .textbook-shelf {
    padding: 20px;
    border-radius: 24px;
  }

  .shelf-heading {
    align-items: start;
    flex-direction: column;
    gap: 14px;
  }

  .textbook-spines {
    grid-template-columns: repeat(6, 142px);
    padding: 3px 3px 10px;
    scroll-snap-type: x proximity;
  }

  .textbook-spine {
    min-height: 250px;
    scroll-snap-align: start;
  }
}
</style>
