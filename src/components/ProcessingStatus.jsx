import React from "react";

const ProcessingStatus = ({
  isProcessing,
  progress,
  currentStep,
  totalSteps,
  statusMessage,
}) => {
  if (!isProcessing && !statusMessage) return null;

  return (
    <div className="processing-status">
      {isProcessing && (
        <>
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.max(progress || 0, 5)}%` }}
              />
            </div>
            <div className="progress-text">{progress}% Complete</div>
          </div>

          <div className="processing-info">
            <p>
              <strong>Processing files...</strong>
              {currentStep &&
                totalSteps &&
                ` (Step ${currentStep} of ${totalSteps})`}
            </p>
            {statusMessage && <p className="status-message">{statusMessage}</p>}

            <div className="processing-tips">
              <small>
                💡 <strong>Processing large files:</strong> This may take a few
                minutes. The app processes data in chunks to prevent browser
                freezing.
              </small>
            </div>
          </div>
        </>
      )}

      {!isProcessing && statusMessage && (
        <div className="success-message">
          <p>{statusMessage}</p>
        </div>
      )}
    </div>
  );
};

export default ProcessingStatus;
