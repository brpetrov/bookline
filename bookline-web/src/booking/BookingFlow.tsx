import { useState } from 'react'
import type { AvailableSlot, BookingConfirmation, Service } from '../api/types'
import { money, salonDateLong, salonTime } from '../lib/format'
import { Confirmed } from './Confirmed'
import { DetailsStep } from './DetailsStep'
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

export function BookingFlow() {
  const [step, setStep] = useState<Step>('service')
  const [service, setService] = useState<Service | null>(null)
  const [staffId, setStaffId] = useState<number | null>(null)
  const [slot, setSlot] = useState<AvailableSlot | null>(null)
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null)

  const reset = () => {
    setService(null)
    setStaffId(null)
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
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Kestrel &amp; Co</h1>
          <p className="mt-1 text-sm text-slate-500">Hair studio · Leeds</p>
        </header>

        {step !== 'done' && (
          <div className="mt-6">
            <Stepper current={STEP_INDEX[step]} />
          </div>
        )}

        {step !== 'service' && step !== 'done' && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={back}
              className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              ← Back
            </button>
            {service && (
              <p className="truncate text-sm text-slate-500">
                {service.name} · {money(service.pricePence)}
                {slot && step === 'details' && (
                  <>
                    {' · '}
                    {salonDateLong(slot.startsAtUtc)} {salonTime(slot.startsAtUtc)}
                  </>
                )}
              </p>
            )}
          </div>
        )}

        <main className="mt-6">
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
                setStaffId(picked)
                setStep('time')
              }}
            />
          )}

          {step === 'time' && service && (
            <TimeStep
              service={service}
              staffId={staffId}
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
    </div>
  )
}
