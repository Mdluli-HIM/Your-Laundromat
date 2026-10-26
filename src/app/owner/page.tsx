import OwnerApp from "@/components/owner/OwnerApp";

export const metadata = { title: "Owner view" };

export default function Owner() {
  return (
    <main className="page">
      <h1>Owner view</h1>
      <OwnerApp />
    </main>
  );
}
