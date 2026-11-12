import { Constants } from '@cuerda/shared'
import { useTranslation } from 'react-i18next'
import { inputClass } from '../../components/ui'
import type { CatalogGroup, CatalogStage } from '../../lib/api'
import { defaultNewStage, type Choice, type Unmatched } from './importState'

const CATEGORIES = Constants.public.Enums.categoria_conjunto
const STAGE_TYPES = Constants.public.Enums.tipo_escenario

interface Props {
  kind: 'stage' | 'group'
  item: Unmatched
  choice: Choice | undefined
  options: (CatalogGroup | CatalogStage)[]
  /** Si el título del escenario traía una parada: sirve para proponer que es itinerante. */
  hasStop?: boolean
  onChange: (choice: Choice | undefined) => void
}

/**
 * Un nombre de la cartelera que no coincide con nada. El admin dice qué es: uno que ya
 * existe (y si ese nombre se guarda como alias) o uno nuevo. No se sugiere nada por parecido
 * (decisión 5).
 */
export function NameResolver({ kind, item, choice, options, hasStop = false, onChange }: Props) {
  const { t } = useTranslation()
  const radioName = `${kind}-${item.key}`
  const existing = choice?.kind === 'existing' ? choice : null
  const isNew = choice?.kind === 'newGroup' || choice?.kind === 'newStage'

  const startNew = () =>
    onChange(
      kind === 'group'
        ? { kind: 'newGroup', nombre: item.name, categoria: 'otro' }
        : defaultNewStage(item.name, hasStop),
    )

  return (
    <fieldset className="space-y-3 rounded-xl border border-amber-300 bg-white p-4">
      <legend className="px-1 text-sm">
        <span className="font-semibold">{item.name}</span>{' '}
        <span className="text-slate-600">
          {t(`import.unmatched.${kind}`, { count: item.lines })}
        </span>
      </legend>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={radioName}
            checked={existing !== null}
            onChange={() => onChange({ kind: 'existing', id: null, saveAlias: false })}
          />
          {t(`import.resolve.existing.${kind}`)}
        </label>
        {existing && (
          <div className="ml-6 space-y-2">
            <select
              aria-label={t(`import.resolve.pick.${kind}`, { name: item.name })}
              className={inputClass}
              value={existing.id ?? ''}
              onChange={(event) =>
                onChange({
                  ...existing,
                  id: event.target.value ? Number(event.target.value) : null,
                })
              }
            >
              <option value="">{t('import.resolve.choose')}</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.nombre}
                </option>
              ))}
            </select>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={existing.saveAlias}
                onChange={(event) => onChange({ ...existing, saveAlias: event.target.checked })}
              />
              <span>
                {t('import.resolve.saveAlias', { name: item.name })}
                <span className="block text-xs text-slate-500">
                  {t(`import.resolve.saveAliasHint.${kind}`)}
                </span>
              </span>
            </label>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name={radioName} checked={isNew} onChange={startNew} />
          {t(`import.resolve.new.${kind}`)}
        </label>
        {choice?.kind === 'newGroup' && (
          <div className="ml-6 grid gap-2 sm:grid-cols-2">
            <input
              aria-label={t('import.resolve.newName', { name: item.name })}
              className={inputClass}
              value={choice.nombre}
              onChange={(event) => onChange({ ...choice, nombre: event.target.value })}
            />
            <select
              aria-label={t('import.resolve.category', { name: item.name })}
              className={inputClass}
              value={choice.categoria}
              onChange={(event) =>
                onChange({ ...choice, categoria: event.target.value as typeof choice.categoria })
              }
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(`category.${category}`)}
                </option>
              ))}
            </select>
          </div>
        )}
        {choice?.kind === 'newStage' && (
          <div className="ml-6 grid gap-2 sm:grid-cols-2">
            <input
              aria-label={t('import.resolve.newName', { name: item.name })}
              className={inputClass}
              value={choice.nombre}
              onChange={(event) => onChange({ ...choice, nombre: event.target.value })}
            />
            <select
              aria-label={t('import.resolve.stageType', { name: item.name })}
              className={inputClass}
              value={choice.tipo}
              onChange={(event) =>
                onChange({ ...choice, tipo: event.target.value as typeof choice.tipo })
              }
            >
              {STAGE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`stageType.${type}`)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={choice.itinerante}
                onChange={(event) => onChange({ ...choice, itinerante: event.target.checked })}
              />
              {t('import.resolve.itinerant')}
            </label>
          </div>
        )}
      </div>
    </fieldset>
  )
}
