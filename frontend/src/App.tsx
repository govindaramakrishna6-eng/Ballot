import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { NotFound } from "./components/States";
import { CreatePoll } from "./pages/CreatePoll";
import { PollDetail } from "./pages/PollDetail";
import { PollList } from "./pages/PollList";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PollList />} />
        <Route path="create" element={<CreatePoll />} />
        <Route path="poll/:id" element={<PollDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
