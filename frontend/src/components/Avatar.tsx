import { useEffect, useState } from "react";

export default function AvatarFace({
  url,
  name,
}: {
  url: string | null;
  name: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  if (url && !broken) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return <>{name.slice(0, 1).toUpperCase()}</>;
}
