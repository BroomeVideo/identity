import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { AWSImportExportReadOnlyAccess } from "@pulumi/aws/iam";

// Create a bot user for CI/CD.
const botUser = new aws.iam.User("botUser");

// Create an access key for the bot user.
const botKey = new aws.iam.AccessKey("botKey", {
    user: botUser.name,
});

type Policies = {
    [name: string]: pulumi.Input<aws.ARN>
};

function roleWithPolicies(name: string, args: aws.iam.RoleArgs, policies: Policies): aws.iam.Role {
    const role = new aws.iam.Role(name, args);

    const attachments: aws.iam.RolePolicyAttachment[] = Object.keys(policies)
        .map(policy => new aws.iam.RolePolicyAttachment(
            `${name}-${policy}`, {
                policyArn: policies[policy],
                role: role,
            },
            {
                parent: role,
            }
        )
    );

    return role;
}

const assumeRolePolicy = botUser.arn.apply(arn => (<aws.iam.PolicyDocument>{
    Version: "2012-10-17",
    Statement: [
        {
            Effect: "Allow",
            Principal: {
                AWS: arn,
            },
            Action: "sts:AssumeRole",
        }
    ],
}));

const infraPolicies = {
    "adminAccess": aws.iam.AdministratorAccess,
};

const appPolicies = {
    "ecrPowerUser": aws.iam.AmazonEC2ContainerRegistryPowerUser,
};

export const infraRole = roleWithPolicies(
    "infraRole",
    {
        description: "Infrastructure role for CI users",
        assumeRolePolicy: assumeRolePolicy,
    },
    infraPolicies
);

export const appRole = roleWithPolicies(
    "appRole",
    {
        description: "Application role for CI users",
        assumeRolePolicy: assumeRolePolicy,
    },
    appPolicies
);

// Export the bot for use with other stacks.
// export const botUserArn = botUser.arn
// export const botUserName = botUser.name
// export const botUserKeyId = botKey.id
// export const botUserKeySecret = botKey.secret
export const infraRoleArn = infraRole.arn;
export const appRoleArn = appRole.arn;
