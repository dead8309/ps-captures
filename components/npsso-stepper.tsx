"use client";

import {
  Result,
  useAtom,
  useAtomSet,
  useAtomValue,
} from "@effect-atom/atom-react";
import { CheckCircle, Copy, ExternalLink, Key, LogIn } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defineStepper } from "@/components/ui/stepper";
import { authAtom, npssoAtom } from "@/lib/atoms";
import { Spinner } from "./ui/spinner";

const { Stepper } = defineStepper(
  {
    id: "step-1",
    title: "Login to PSN",
    description: "Sign in to PlayStation Store",
    icon: <LogIn className="size-4" />,
  },
  {
    id: "step-2",
    title: "Get Token",
    description: "Visit the token endpoint",
    icon: <Key className="size-4" />,
  },
  {
    id: "step-3",
    title: "Copy Token",
    description: "Extract NPSSO from response",
    icon: <Copy className="size-4" />,
  },
  {
    id: "step-4",
    title: "Enter Token",
    description: "Paste token to access captures",
    icon: <CheckCircle className="size-4" />,
  },
);

const npssoJson = '{ "npsso": "your_token_here" }';

export function NpssoStepper() {
  const [token, setNpsso] = useAtom(npssoAtom);
  const authSet = useAtomSet(authAtom);
  const authResult = useAtomValue(authAtom);
  const isLoading = Result.isWaiting(authResult);

  const handleEnterToken = (token: string) => {
    if (token.trim()) {
      toast.loading("Authenticating with PlayStation Network...");
      authSet({ npsso: token.trim() });
    }
  };

  useEffect(() => {
    Result.match(authResult, {
      onInitial: () => {},
      onSuccess: () => {
        toast.dismiss();
        toast.success("Successfully authenticated!");
      },
      onFailure: (error) => {
        toast.dismiss();
        if (error.cause._tag === "Fail") {
          const tag = error.cause.error._tag;
          switch (tag) {
            case "AuthCodeFailed":
              toast.error(
                "Failed to obtain authorization code from PSN. Please try again.",
              );
              break;
            case "NoAuthCode":
              toast.error(
                "No authorization code found in PSN response. Please try again.",
              );
              break;
            case "TokenExchangeFailed":
              toast.error(
                "Failed to exchange code for tokens. Please try again later.",
              );
              break;
            case "RateLimitedError":
              toast.error(
                "You have been rate-limited by PSN. Please try after some time.",
              );
              break;
            default:
              toast.error(
                "An unexpected error occurred. Please try again later.",
              );
          }
        }
      },
    });
  }, [authResult]);
  return (
    <Stepper.Provider className="space-y-4" variant="vertical">
      {({ methods }) => (
        <React.Fragment>
          <Stepper.Navigation>
            {methods.all.map((step) => (
              <Stepper.Step
                key={step.id}
                of={step.id}
                onClick={() => methods.goTo(step.id)}
                icon={step.icon}
              >
                <Stepper.Title>{step.title}</Stepper.Title>
                <Stepper.Description>{step.description}</Stepper.Description>
                {methods.when(step.id, () => (
                  <Stepper.Panel className="space-y-4 text-left">
                    {step.id === "step-1" && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Open your web browser and navigate to the PlayStation
                          Store, then log in to your PlayStation Network account
                          using your email and password.
                        </p>
                        <Link
                          href="https://store.playstation.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline text-primary inline-flex items-center gap-1 break-words"
                        >
                          https://store.playstation.com/
                          <ExternalLink className="size-3" />
                        </Link>
                      </div>
                    )}
                    {step.id === "step-2" && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Once logged in, go to this special URL to retrieve
                          your NPSSO token.
                        </p>
                        <Link
                          href="https://ca.account.sony.com/api/v1/ssocookie"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline text-primary inline-flex items-center gap-1"
                        >
                          ca.account.sony.com
                          <ExternalLink className="size-3" />
                        </Link>
                      </div>
                    )}
                    {step.id === "step-3" && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          You&apos;ll see a JSON response. Copy the value of the
                          &quot;npsso&quot; field.
                        </p>
                        <code className="text-sm bg-muted px-2 py-1 rounded font-mono text-muted-foreground block">
                          {npssoJson}
                        </code>
                      </div>
                    )}
                    {step.id === "step-4" && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Paste your NPSSO token below to access your
                          PlayStation captures.
                        </p>
                        <Input
                          value={token}
                          onChange={(e) => setNpsso(e.target.value)}
                          placeholder="Paste your NPSSO token here"
                          className="w-full"
                        />
                        <Button
                          onClick={() => handleEnterToken(token)}
                          size="lg"
                          className="w-full"
                          disabled={!token.trim() || isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Spinner className="mr-2 h-4 w-4" />
                              Authenticating...
                            </>
                          ) : (
                            "Continue"
                          )}
                        </Button>
                      </div>
                    )}
                    <Stepper.Controls>
                      {!methods.isLast && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={methods.prev}
                          disabled={methods.isFirst}
                        >
                          Previous
                        </Button>
                      )}
                      {!methods.isLast && (
                        <Button onClick={methods.next}>Next</Button>
                      )}
                    </Stepper.Controls>
                  </Stepper.Panel>
                ))}
              </Stepper.Step>
            ))}
          </Stepper.Navigation>
        </React.Fragment>
      )}
    </Stepper.Provider>
  );
}
