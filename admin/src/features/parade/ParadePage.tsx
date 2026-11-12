import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { Field, inputClass, Notice, PageTitle } from '../../components/ui'
import * as api from '../../lib/api'
import { formatNight } from '../../lib/format'
import { ClosuresEditor } from './ClosuresEditor'
import { OrderEditor } from './OrderEditor'
import { RouteEditor } from './RouteEditor'
import { ScheduleForm } from './ScheduleForm'

/**
 * Todo lo del Desfile de Llamadas es dato de la base y va por noche (decisiones 25 y 64):
 * cada noche es un evento, con su orden, su horario, su recorrido y sus cortes.
 */
export function ParadePage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const events = useQuery({ queryKey: ['parade-events'], queryFn: api.fetchParadeEvents })

  const wanted = Number(params.get('evento'))
  const event = events.data?.find((e) => e.id === wanted) ?? events.data?.[0]

  return (
    <>
      <PageTitle title={t('parade.title')} intro={t('parade.intro')} />
      {events.isError && <Notice kind="error">{t('parade.loadFailed')}</Notice>}
      {events.data?.length === 0 && <Notice kind="warn">{t('parade.noEvents')}</Notice>}

      {event && (
        <>
          <div className="w-full max-w-md">
            <Field label={t('parade.night')} hint={formatNight(event.fecha_inicio)}>
              <select
                className={inputClass}
                value={event.id}
                onChange={(e) => setParams({ evento: e.target.value }, { replace: true })}
              >
                {events.data!.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {/* Con `key`, cada noche arranca con sus propios formularios. */}
          <ScheduleForm key={`schedule-${event.id}`} event={event} />
          <OrderEditor key={`order-${event.id}`} eventId={event.id} />
          <RouteEditor key={`route-${event.id}`} event={event} />
          <ClosuresEditor key={`closures-${event.id}`} eventId={event.id} />
        </>
      )}
    </>
  )
}
