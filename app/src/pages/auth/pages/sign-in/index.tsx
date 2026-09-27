import type { FC } from "react";
import { Link } from "react-router-dom";
import { Panel } from "@/components/ui/panel";
import { Routes } from "@/routes/routes";
import { SignInForm } from "./components/sign-in-form";

const SignInPage: FC = () => {
  return (
    <Panel className="p-6">
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-medium">Sign in</h2>
        <p className="text-[13px] text-muted-foreground">Your projects and organizations sync across devices.</p>
      </div>
      <SignInForm />
      <div className="mt-4 text-center text-[13px] text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to={Routes.auth.sign_up} className="text-foreground underline underline-offset-4">
          Create one
        </Link>
      </div>
    </Panel>
  );
};

export default SignInPage;
