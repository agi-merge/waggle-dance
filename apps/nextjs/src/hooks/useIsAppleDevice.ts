import { useState } from "react";

import useIsomorphicLayoutEffect from "./useIsomorphicLayoutEffect";

const useIsAppleDevice = () => {
  const [isAppleDevice, setIsAppleDevice] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsAppleDevice(/(mac|iphone|ipod|ipad|vision)/i.test(ua));
  }, []);

  return isAppleDevice;
};

export default useIsAppleDevice;
