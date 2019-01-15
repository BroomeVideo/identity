echo "Travis push job"

# Update the stack
case ${TRAVIS_BRANCH} in
    master)
        pulumi stack select broomevideo/identity-staging
        pulumi update --yes
        ;;
    production)
        pulumi stack select broomevideo/identity-production
        pulumi update --yes
        ;;
    *)
        echo "No Pulumi stack associated with branch ${TRAVIS_BRANCH}."
        ;;
esac
