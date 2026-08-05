import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AvailableSlot, BookingConfirmation, Service, Staff } from '../api/types'
import { money, salonDateLong, salonTime } from '../lib/format'
import { Confirmed } from './Confirmed'
import { DetailsStep } from './DetailsStep'
import { SalonPanel } from './SalonPanel'
import { ServiceStep } from './ServiceStep'
import { StaffStep } from './StaffStep'
import { Stepper } from './Stepper'
import { TimeStep } from './TimeStep'

type Step = 'service' | 'staff' | 'time' | 'details' | 'done'

const STEP_INDEX: Record<Step, number> = {
  service: 0,
  staff: 1,
  time: 2,
  details: 3,
  done: 4,
}

const HEADINGS: Record<Step, { title: string; hint: string }> = {
  service: { title: 'What can we do for you?', hint: 'Pick a treatment to see the next free times.' },
  staff: { title: 'Who would you like?', hint: 'Choose a stylist, or let us find the earliest slot.' },
  time: { title: 'Choose a time', hint: 'Live availability for the next two weeks.' },
  details: { title: 'Your details', hint: 'Just enough for us to confirm your appointment.' },
  done: { title: '', hint: '' },
}

export function BookingFlow() {
  const [step, setStep] = useState<Step>('service')
  const [service, setService] = useState<Service | null>(null)
  const [stylist, setStylist] = useState<Staff | null>(null)
  const [slot, setSlot] = useState<AvailableSlot | null>(null)
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null)

  const { data: business } = useQuery({ queryKey: ['business'], queryFn: api.business })

  const reset = () => {
    setService(null)
    setStylist(null)
    setSlot(null)
    setConfirmation(null)
    setStep('service')
  }

  const back = () => {
    if (step === 'staff') setStep('service')
    if (step === 'time') setStep('staff')
    if (step === 'details') setStep('time')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            K
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight text-slate-900">
              {business?.name ?? 'Kestrel & Co'}
            </span>
            <span className="block text-xs text-slate-500">Hair studio · Leeds</span>
          </span>
          <span className="ml-auto hidden text-xs text-slate-400 sm:block">
            Book online · takes about a minute
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_20rem] lg:py-10">
        <div className="min-w-0">
          {step !== 'done' && (
            <>
              <Stepper current={STEP_INDEX[step]} />

              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                    {HEADINGS[step].title}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">{HEADINGS[step].hint}</p>
                </div>
                {step !== 'service' && (
                  <button
                    type="button"
                    onClick={back}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-900"
                  >
                    ← Back
                  </button>
                )}
              </div>

              {/* The panel carries this on desktop; on a phone it's the only summary. */}
              {service && (
                <p className="mt-3 truncate text-sm text-slate-500 lg:hidden">
                  {service.name} · {money(service.pricePence)}
                  {slot && step === 'details' && (
                    <>
                      {' · '}
                      {salonDateLong(slot.startsAtUtc)} {salonTime(slot.startsAtUtc)}
                    </>
                  )}
                </p>
              )}
            </>
          )}

          <main className={'mt-6' + (step === 'done' ? ' mx-auto max-w-lg' : '')}>
            {step === 'service' && (
              <ServiceStep
                onPick={(picked) => {
                  setService(picked)
                  setStep('staff')
                }}
              />
            )}

            {step === 'staff' && service && (
              <StaffStep
                service={service}
                onPick={(picked) => {
                  setStylist(picked)
                  setStep('time')
                }}
              />
            )}

            {step === 'time' && service && (
              <TimeStep
                service={service}
                staffId={stylist?.id ?? null}
                onPick={(picked) => {
                  setSlot(picked)
                  setStep('details')
                }}
              />
            )}

            {step === 'details' && service && slot && (
              <DetailsStep
                service={service}
                slot={slot}
                onBooked={(result) => {
                  setConfirmation(result)
                  setStep('done')
                }}
                onSlotTaken={() => {
                  setSlot(null)
                  setStep('time')
                }}
              />
            )}

            {step === 'done' && confirmation && (
              <Confirmed confirmation={confirmation} onBookAnother={reset} />
            )}
          </main>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-8">
            <SalonPanel
              business={business}
              service={step === 'done' ? null : service}
              stylist={stylist}
              slot={slot}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
