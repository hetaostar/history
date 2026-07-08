import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoryStore } from '@/stores/historyStore'
import ImportExportPage from './ImportExportPage.vue'

describe('ImportExportPage', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('点击导出按钮时生成 download link 且 download 属性为指定文件名', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:fake-url')
    const clickedAnchors: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedAnchors.push(this)
    })

    const wrapper = mount(ImportExportPage, {
      global: { plugins: [pinia] },
    })

    const exportButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('导出 JSON 文件'))
    await exportButton!.trigger('click')

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(clickedAnchors).toHaveLength(1)
    expect(clickedAnchors[0].download).toBe('history-memorization-export.json')
    expect(clickedAnchors[0].href).toBe('blob:fake-url')
  })

  it('导出的 JSON 含 version: 1 且不含 lastError', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    store.createTimeline({ name: '测试时间线', description: '', tags: [] })

    let capturedBlob: Blob | null = null
    vi.spyOn(URL, 'createObjectURL').mockImplementation((obj) => {
      capturedBlob = obj as Blob
      return 'blob:fake-url'
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const wrapper = mount(ImportExportPage, {
      global: { plugins: [pinia] },
    })

    const exportButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('导出 JSON 文件'))
    await exportButton!.trigger('click')

    expect(capturedBlob).not.toBeNull()
    const text = await (capturedBlob as unknown as Blob).text()
    const parsed = JSON.parse(text)

    expect(parsed.version).toBe(1)
    expect(parsed).not.toHaveProperty('lastError')
  })

  it('导入合法 JSON 后调用 store.replaceAll', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()

    const replaceAllSpy = vi.spyOn(store, 'replaceAll')
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )

    const wrapper = mount(ImportExportPage, {
      global: { plugins: [pinia] },
    })

    const file = new File(
      [
        JSON.stringify({
          version: 1,
          timelines: [],
          events: [],
          people: [],
          cards: [],
          studyRecords: [],
        }),
      ],
      'test.json',
      { type: 'application/json' },
    )

    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    })
    await input.trigger('change')

    expect(replaceAllSpy).toHaveBeenCalledTimes(1)
  })

  it('导入非法 JSON 时显示错误且不调用 store.replaceAll', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()

    const replaceAllSpy = vi.spyOn(store, 'replaceAll')

    const wrapper = mount(ImportExportPage, {
      global: { plugins: [pinia] },
    })

    const file = new File(['{ not valid json'], 'bad.json', {
      type: 'application/json',
    })

    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    })
    await input.trigger('change')

    expect(replaceAllSpy).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('导入文件格式不正确')
  })
})
