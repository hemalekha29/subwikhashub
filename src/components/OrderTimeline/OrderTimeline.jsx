import { Fragment } from 'react';
import styles from './OrderTimeline.module.css';

const STATUSES = ['paid', 'processing', 'shipped', 'delivered'];
const STATUS_LABELS = { paid: 'New Order', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
const STATUS_COLORS = { paid: '#c9a84c', processing: '#6c8ebf', shipped: '#f5a623', delivered: '#4ade80', cancelled: '#ef4444' };

export { STATUSES, STATUS_LABELS, STATUS_COLORS };

export default function OrderTimeline({ status }) {
  if (status === 'cancelled') {
    return (
      <div className={styles.cancelledBanner}>
        <span className={styles.cancelledIcon}>✕</span>
        <div>
          <strong>Order Cancelled</strong>
          <p>This order has been cancelled.</p>
        </div>
      </div>
    );
  }

  const currentIdx = STATUSES.indexOf(status);

  return (
    <div className={styles.pipeline}>
      {STATUSES.map((s, i) => (
        <Fragment key={s}>
          {i > 0 && (
            <div className={`${styles.pipeLine} ${i <= currentIdx ? styles.pipeLineDone : ''}`} />
          )}
          <div
            className={`${styles.pipeDot} ${i <= currentIdx ? styles.pipeDotDone : ''}`}
            style={i <= currentIdx ? { background: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] } : {}}
          >
            {i <= currentIdx ? '✓' : i + 1}
          </div>
        </Fragment>
      ))}
      {STATUSES.map((s, i) => (
        <span
          key={`lbl-${s}`}
          className={`${styles.pipeLabel} ${i <= currentIdx ? styles.pipeLabelDone : ''}`}
          style={{
            gridColumn: i * 2 + 1,
            ...(i === currentIdx ? { color: STATUS_COLORS[s] } : {}),
          }}
        >
          {STATUS_LABELS[s]}
        </span>
      ))}
    </div>
  );
}
