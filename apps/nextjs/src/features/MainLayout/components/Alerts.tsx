import usePreferences from "~/stores/preferencesStore";

const Alerts = () => {
  const { isDemoAlertOpen } = usePreferences();
  return <>{isDemoAlertOpen && <></>}</>;
};

export default Alerts;
