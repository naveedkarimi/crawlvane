"use client";

import { useEffect, useState } from "react";
import SpeedTest, { useSpeedTest } from "@/components/SpeedTest";
import UrlForm from "@/components/UrlForm";

/** Fresh hook per URL (keyed), so results from an earlier URL are never reused. */
function Runner({ url }: { url: string }) {
  const speed = useSpeedTest(url);
  useEffect(() => {
    speed.run("mobile");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <SpeedTest url={url} speed={speed} />;
}

export default function SpeedTool() {
  const [url, setUrl] = useState("");
  return (
    <div className="tool">
      <UrlForm id="speed-url" button="Test speed" onSubmit={setUrl} />
      {url && <div className="tool-result"><Runner key={url} url={url} /></div>}
    </div>
  );
}
