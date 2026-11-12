import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { HeartIcon } from '../../components/ui/icons'
import { isRateLimited } from '../../lib/api'
import { tapLight } from '../../lib/haptics'
import { PushPrompt } from '../push/PushPrompt'
import { useFollowed, useToggleFollow } from './useFollow'

interface FollowButtonProps {
  groupId: number
  groupName: string
  /** Lo que va al lado del botón, en la misma línea: los botones de las redes. */
  aside?: ReactNode
}

/** «Seguir» de un conjunto: sin registro y sin datos personales. Es el botón principal de la ficha. */
export function FollowButton({ groupId, groupName, aside }: FollowButtonProps) {
  const { t } = useTranslation()
  const { ids, isPending } = useFollowed()
  const toggle = useToggleFollow()
  const following = ids.has(groupId)

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-3">
        <button
          type="button"
          aria-pressed={following}
          aria-label={t(following ? 'follow.followingName' : 'follow.followName', {
            name: groupName,
          })}
          // Hasta saber si ya lo sigue, el botón no dice ni hace nada equivocado.
          disabled={isPending}
          onClick={() => {
            tapLight()
            toggle.mutate({ groupId, follow: !following })
          }}
          className={`pressable inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-2xl px-6 text-[1.0625rem] font-bold disabled:opacity-60 ${
            following ? 'bg-brand-soft text-brand' : 'bg-brand shadow-button text-white'
          }`}
        >
          <HeartIcon filled={following} className="size-5" />
          {t(following ? 'follow.following' : 'follow.follow')}
        </button>
        {aside}
      </div>
      {toggle.isError && (
        <p role="alert" className="text-danger font-semibold">
          {t(isRateLimited(toggle.error) ? 'follow.rateLimited' : 'follow.error')}
        </p>
      )}
      {/* Los avisos se ofrecen recién cuando el «Seguir» quedó guardado, nunca antes. */}
      {following && !toggle.isPending && <PushPrompt />}
    </div>
  )
}
