import { memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface TradingViewWidgetProps {
  symbol: string;
  onIntervalChange?: (interval: string) => void;
}

function TradingViewWidget({ symbol, onIntervalChange }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);
  const [selectedInterval, setSelectedInterval] = useState("30m");

  const timeframes = [
    { label: "1m", value: "1" },
    { label: "5m", value: "5" },
    { label: "15m", value: "15" },
    { label: "30m", value: "30" },
    { label: "1hr", value: "60" },
    { label: "4hr", value: "240" },
    { label: "D", value: "1D" }
  ];

  const handleIntervalChange = (interval: string, label: string) => {
    setSelectedInterval(label);
    onIntervalChange?.(interval);
    // Reload the widget with new interval
    if (container.current) {
      container.current.innerHTML = '';
      scriptLoaded.current = false;
      loadWidget(interval);
    }
  };

  const loadWidget = (interval: string = "30") => {
    if (scriptLoaded.current || !container.current) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
          "autosize": true,
          "width": "100%",
          "height": "100%",
          "symbol": "${symbol}",
          "interval": "${interval}",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "borderColor": "#1f2937",
          "backgroundColor": "#1f2937",
          "gridColor": "rgba(55, 65, 81, 0.3)",
          "hide_top_toolbar": true,
          "withdateranges": false,
          "hide_legend": true,
          "allow_symbol_change": false,
          "calendar": false,
          "studies": [],
          "hide_volume": false,
          "hide_side_toolbar": false,
          "details": false,
          "hotlist": false,
          "enable_publishing": false,
          "hide_idea_button": true,
          "hide_share_button": true,
          "save_image": false,
          "toolbar_bg": "#1f2937",
          "container_id": "tradingview-chart",
          "show_popup_button": false,
          "popup_width": "1000",
          "popup_height": "650",
          "no_referral_id": true,
          "overrides": {
            "paneProperties.background": "#1f2937",
            "paneProperties.backgroundType": "solid",
            "scalesProperties.backgroundColor": "#1f2937",
            "scalesProperties.lineColor": "rgba(55, 65, 81, 0.3)",
            "scalesProperties.textColor": "#d1d5db",
            "mainSeriesProperties.candleStyle.upColor": "#10b981",
            "mainSeriesProperties.candleStyle.downColor": "#ef4444",
            "mainSeriesProperties.candleStyle.borderUpColor": "#10b981",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
            "mainSeriesProperties.candleStyle.wickUpColor": "#10b981",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
            "volumePaneSize": "medium"
          },
          "support_host": "https://www.tradingview.com"
        }`;
    container.current.appendChild(script);
    scriptLoaded.current = true;
  };

  useEffect(() => {
    // Clear previous widget
    if (container.current) {
      container.current.innerHTML = '';
    }
    scriptLoaded.current = false;

    // Small delay to ensure cleanup is complete
    const timer = setTimeout(() => {
      loadWidget();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (container.current) {
        container.current.innerHTML = '';
      }
      scriptLoaded.current = false;
    };
  }, [symbol]);

  return (
    <div className="relative flex h-full w-full flex-col bg-gray-800 rounded-lg">
      {/* Timeframe Header */}
      <motion.div
        className="flex h-12 items-center justify-between px-4 border-b border-gray-700"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex gap-1">
          {timeframes.map((tf, index) => (
            <motion.button
              key={tf.label}
              onClick={() => handleIntervalChange(tf.value, tf.label)}
              className={`inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium outline-none transition-colors active:opacity-80 h-8 text-xs px-3 ${
                selectedInterval === tf.label
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              {tf.label}
            </motion.button>
          ))}
        </div>

        {/* Chart Title */}
        <div className="flex items-center space-x-2">
          <span className="text-white font-semibold text-sm">{symbol}</span>
          <span className="text-gray-400 text-xs">TradingView</span>
        </div>
      </motion.div>

      {/* Chart Container */}
      <motion.div
        id="tradingview-chart"
        className="w-full flex-1 p-2"
        ref={container}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="tradingview-widget-container__widget rounded h-full"></div>
      </motion.div>
    </div>
  );
}

export default memo(TradingViewWidget);