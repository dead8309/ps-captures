"use client";

import { CheckCircle, Copy, ExternalLink, Key, LogIn } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defineStepper } from "@/components/ui/stepper";

const { Stepper } = defineStepper(
  {
    id: "step-1",
    title: "Login to PSN",
    description: "Open browser and sign in to PlayStation Store",
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

interface NpssoStepperProps {
  onEnterToken: (token: string) => void;
}

const npssoJson = '{ "npsso": "your_token_here" }';

export function NpssoStepper({ onEnterToken }: NpssoStepperProps) {
  const [token, setToken] = React.useState("");
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
                          className="text-sm underline text-primary inline-flex items-center gap-1"
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
                          https://ca.account.sony.com/api/v1/ssocookie
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
                          onChange={(e) => setToken(e.target.value)}
                          placeholder="Paste your NPSSO token here"
                          className="w-full"
                        />
                        <Button
                          onClick={() => onEnterToken(token)}
                          size="lg"
                          className="w-full"
                          disabled={!token.trim()}
                        >
                          Continue
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
