import { fetchResidentActivityDetail } from '@/app/actions/activity';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import DeliveryRefresh from '@/components/cityos/DeliveryRefresh';
import { PROGRESS_STEPS } from '@/lib/resident-logistics/status';

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ sourceType: string; id: string }>;
}) {
  const resolvedParams = await params;
  const detail = await fetchResidentActivityDetail(
    resolvedParams.sourceType.toUpperCase(),
    resolvedParams.id
  );

  if (!detail) {
    notFound();
  }

  const {
    merchantName,
    title,
    amount,
    currency,
    lines,
    order,
    payment,
    paymentMethod,
    refund,
    deliveryDetail: delivery,
    activityAtMs,
  } = detail;

  const dateStr = new Date(activityAtMs).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link
          href="/activity"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-ink">{merchantName}</h1>
          <p className="text-sm text-slate-500 font-medium">{dateStr}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-8">
        <section>
          <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-slate-600">Request</span>
              <span className="font-bold text-ink">{title}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-slate-600">Status</span>
              <span className={`font-bold ${order.tone === 'success' ? 'text-emerald-600' : 'text-slate-700'}`}>
                {order.label}
              </span>
            </div>
            {amount !== null && (
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-600">Total</span>
                <span className="font-black text-ink">
                  {currency === 'USD' ? '$' : '₦'}{Math.round(amount).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </section>

        {lines.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Items</h2>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <div className="flex gap-3">
                    <span className="font-bold text-slate-400">{line.quantity}x</span>
                    <span className="font-medium text-ink">{line.name}</span>
                  </div>
                  {line.unitPrice !== null && (
                    <span className="font-bold text-slate-700">
                      {currency === 'USD' ? '$' : '₦'}{Math.round(line.unitPrice * line.quantity).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {payment && (
          <section>
            <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Payment</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-600">Status</span>
                <span className={`font-bold ${payment.tone === 'success' ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {payment.label}
                </span>
              </div>
              {paymentMethod && (
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-600">Method</span>
                  <span className="font-bold text-ink capitalize">{paymentMethod.replace(/_/g, ' ').toLowerCase()}</span>
                </div>
              )}
              {refund && (
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-600">Refund</span>
                  <span className={`font-bold ${refund.tone === 'success' ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {refund.label}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {delivery && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Delivery</h2>
              {delivery.active && <DeliveryRefresh />}
            </div>

            <div
              className={`rounded-2xl p-4 ${
                delivery.status.tone === 'danger'
                  ? 'bg-rose-50'
                  : delivery.status.tone === 'success'
                    ? 'bg-emerald-50'
                    : 'bg-slate-50'
              }`}
            >
              <p className="text-base font-black text-ink">{delivery.status.label}</p>
              <p className="text-sm text-slate-600 mt-0.5">{delivery.status.description}</p>
              {delivery.delayed && (
                <p className="text-sm font-bold text-amber-700 mt-3">
                  Delivery delayed — your order is taking longer than expected. We&apos;ll keep you updated when there is new information.
                </p>
              )}
            </div>

            {delivery.status.stage !== null && (
              <div className="mt-4" aria-label="Delivery progress">
                <div className="flex gap-1">
                  {PROGRESS_STEPS.map((step, i) => (
                    <div
                      key={step}
                      className={`h-1.5 flex-1 rounded-full ${i <= (delivery.status.stage as number) ? 'bg-ink' : 'bg-slate-200'}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1.5">
                  <span>{PROGRESS_STEPS[0]}</span>
                  <span>{PROGRESS_STEPS[PROGRESS_STEPS.length - 1]}</span>
                </div>
              </div>
            )}

            {delivery.dropoffAddress && (
              <div className="flex justify-between gap-4 text-sm mt-4">
                <span className="font-medium text-slate-600 shrink-0">Delivering to</span>
                <span className="font-bold text-ink text-right">{delivery.dropoffAddress}</span>
              </div>
            )}

            {delivery.active && (
              <p className="text-xs font-medium text-slate-400 mt-3">
                {delivery.tracking.fresh
                  ? 'Rider location is being updated.'
                  : 'Live rider location is not available right now. Status updates appear below.'}
              </p>
            )}

            {delivery.timeline.length > 0 && (
              <div className="space-y-4 mt-5">
                {delivery.timeline.map((ev, idx) => (
                  <div key={`${ev.status.raw}-${ev.atMs}`} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-ink" />
                      {idx < delivery.timeline.length - 1 && <div className="w-0.5 h-full bg-slate-100 my-1" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-bold text-ink">{ev.status.label}</p>
                      <p className="text-xs font-medium text-slate-400">
                        {new Date(ev.atMs).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Support Section */}
        <section className="pt-4 border-t border-slate-100 flex flex-col gap-3">
          <Link
            href={`/support?sourceType=${resolvedParams.sourceType}&sourceId=${resolvedParams.id}`}
            className="w-full text-center py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
          >
            Report an issue
          </Link>
          {payment && (
            <Link
              href={`/support?action=refund&sourceType=${resolvedParams.sourceType}&sourceId=${resolvedParams.id}`}
              className="w-full text-center py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold hover:border-slate-300 transition-colors"
            >
              Request refund
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
