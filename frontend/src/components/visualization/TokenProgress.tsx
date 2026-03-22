interface TokenProgressProps {
  layer: string;
  tokensUsed: number;
  budget: number;
}

export function TokenProgress({ layer, tokensUsed, budget }: TokenProgressProps) {
  const percentage = Math.min((tokensUsed / budget) * 100, 100);
  const isWarning = percentage > 60;
  const isCritical = percentage > 90;

  const getProgressColor = () => {
    if (isCritical) return '#dc2626';
    if (isWarning) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="token-progress">
      <div className="progress-label">
        <span>{layer} layer</span>
        <span>{tokensUsed}/{budget} tokens</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: getProgressColor(),
          }}
        />
      </div>
    </div>
  );
}
