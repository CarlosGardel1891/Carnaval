import { useTranslation } from 'react-i18next'
import { isRateLimited } from '../../lib/api'
import { PushPrompt } from '../push/PushPrompt'
import { useFollowed, useToggleFollow } from './useFollow'

interface FollowButtonProps {
  groupId: number
  groupName: string
}

/** «Seguir» de un conjunto: sin registro y sin datos personales. */
export function FollowButton({ groupId, groupName }: FollowButtonProps) {
  const { t } = useTranslation()
  const { ids, isPending } = useFollowed()
  const toggle = useToggleFollow()
  const following = ids.has(groupId)

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-pressed={following}
        aria-label={t(following ? 'follow.followingName' : 'follow.followName', {
          name: groupName,
        })}
        // Hasta saber si ya lo sigue, el botón no dice ni hace nada equivocado.
        disabled={isPending}
        onClick={() => toggle.mutate({ groupId, follow: !following })}
        className={`min-h-12 rounded-xl border px-6 text-lg font-semibold disabled:opacity-60 ${
          following ? 'bg-raised text-ink border-accent' : 'bg-accent text-accent-ink border-accent'
        }`}
      >
        {t(following ? 'follow.following' : 'follow.follow')}
      </button>
      {toggle.isError && (
        <p role="alert" className="text-danger">
          {t(isRateLimited(toggle.error) ? 'follow.rateLimited' : 'follow.error')}
        </p>
      )}
      {/* Los avisos se ofrecen recién cuando el «Seguir» quedó guardado, nunca antes. */}
      {following && !toggle.isPending && <PushPrompt />}
    </div>
  )
}
