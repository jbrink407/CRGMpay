import dynamic from "next/dynamic";

const PaySheetApp = dynamic(
  () =>
    import("@/components/pay-sheet-app").then((mod) => ({
      default: mod.PaySheetApp,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-full bg-[#ece7de] p-6 text-sm text-[#6f675c]">
        Loading pay sheet…
      </div>
    ),
  },
);

export default function Home() {
  return <PaySheetApp />;
}
