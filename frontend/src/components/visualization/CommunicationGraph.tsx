import './visualization.css';

interface CommunicationGraphProps {
  isPaused: boolean;
}

export function CommunicationGraph(props: CommunicationGraphProps) {
  void props.isPaused;
  return (
    <div className="communication-graph">
      <div className="placeholder-content">
        <p>Communication graph visualization will be implemented here</p>
      </div>
    </div>
  );
}
