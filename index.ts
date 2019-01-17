import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Create a bot user for managing Kubernetes infrastucture and applications in CI/CD scenarios.
const botUser = new aws.iam.User("botUser");

// Create an access key for the bot user.
const botKey = new aws.iam.AccessKey("botKey", {
    user: botUser.name,
});

type Policies = {
    [name: string]: pulumi.Input<aws.ARN>
};

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

// The infrastructure role allows the bot user to create and manage infrastructure.
// https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_job-functions.html#jf_administrator
const infraRole = roleWithPolicies(
    "infraRole",
    {
        assumeRolePolicy: assumeRolePolicy,
    },
    {
        adminAccess: aws.iam.AdministratorAccess,
    }
);

// The app role allows the bot user to interact with the Amazon ECR service.
// https://docs.aws.amazon.com/AmazonECR/latest/userguide/ecr_managed_policies.html#AmazonEC2ContainerRegistryPowerUser
const appRole = roleWithPolicies(
    "appRole",
    {
        assumeRolePolicy: assumeRolePolicy,
    },
    {
        ecrPowerUser: aws.iam.AmazonEC2ContainerRegistryPowerUser,
    }
);

// Export the infrastructure and application roles for use by the infrastructure stack.
export const infraRoleArn = infraRole.arn;
export const appRoleArn = appRole.arn;
