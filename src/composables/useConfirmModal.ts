import { ref } from 'vue'

/**
 * 统一的确认模态状态机。
 * 用法：
 *   const modal = useConfirmModal()
 *   modal.request('确认删除？', () => store.deleteSomething(id))
 *   <ConfirmActionModal v-if="modal.isVisible.value" :message="modal.message.value" @confirm="modal.confirm" @cancel="modal.cancel" />
 */
export function useConfirmModal() {
  const isVisible = ref(false)
  const message = ref('')
  let pendingAction: (() => void) | null = null

  function request(messageText: string, action: () => void) {
    message.value = messageText
    pendingAction = action
    isVisible.value = true
  }

  function confirm() {
    const action = pendingAction
    pendingAction = null
    isVisible.value = false
    action?.()
  }

  function cancel() {
    pendingAction = null
    isVisible.value = false
  }

  return { isVisible, message, request, confirm, cancel }
}
