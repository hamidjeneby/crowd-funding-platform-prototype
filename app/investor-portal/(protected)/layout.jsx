import ToastNotificationStack from "@/app/investor-portal/components/ToastNotificationStack";

export default function ProtectedInvestorLayout({ children }) {
  return (
    <>
      <ToastNotificationStack />
      {children}
    </>
  );
}
