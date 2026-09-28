import type { FC } from "react";
import { Link } from "react-router-dom";
import { Panel } from "@/components/ui/panel";
import { Routes } from "@/routes/routes";
import { SignUpForm } from "./components/sign-up-form";

const SignUpPage: FC = () => {
  return (
    <Panel className="p-6">
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-medium">Create your account</h2>
        <p className="text-[0.8125rem] text-muted-foreground">You'll get a personal workspace; invite your team or join theirs afterwards.</p>
      </div>
      <SignUpForm />
      <div className="mt-4 text-center text-[0.8125rem] text-muted-foreground">
        Already have an account?{" "}
        <Link to={Routes.auth.sign_in} className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </Panel>
  );
};

export default SignUpPage;
