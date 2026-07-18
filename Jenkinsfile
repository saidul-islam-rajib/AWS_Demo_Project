pipeline {
    agent any

    options {
        timestamps()
        // 15 builds of logs and metadata on a 6.6GB root volume is more
        // history than the disk can afford; 8 is plenty to debug from.
        buildDiscarder(logRotator(numToKeepStr: '8'))
        // Two builds writing images to a nearly-full disk at once is how a
        // slow build becomes a stuck one.
        disableConcurrentBuilds()
        timeout(time: 20, unit: 'MINUTES')
    }

    environment {
        CONTAINER_NAME = 'nestjs-app'
        IMAGE_NAME     = 'nestjs-image'
        EMAIL          = 'saidul.rajib.bd@gmail.com'
        PORT           = '3000'
        APP_DIR        = 'automation'
        PUBLIC_URL     = 'http://16.171.254.209:3000'
        // Named volume holding posts.json, so content survives redeploys.
        DATA_VOLUME    = 'blog_data'
        // Secrets live on the host, never in this repository.
        ENV_FILE       = '/opt/blog/.env'
    }

    stages {

        /*
         * Reclaim space before the build needs it.
         *
         * Cleanup used to run only in post, which is too late: once the disk
         * is full, a build cannot get far enough to reach the step that would
         * have freed the space, so it fails in milliseconds having done
         * nothing and the disk stays full. Builds #41-#45 were that loop.
         */
        stage('Preflight') {
            steps {
                sh '''
                    echo "Disk before preflight:"
                    df -h / | tail -1

                    docker container prune -f || true
                    docker image prune -f || true
                    docker builder prune -af || true

                    # Under 2GB this build cannot finish anyway, so drop every
                    # image not backing a running container and look again.
                    free_kb=$(df -Pk / | awk 'NR==2 {print $4}')
                    if [ "$free_kb" -lt 2097152 ]; then
                        echo "Under 2GB free — clearing unused images."
                        docker image prune -af || true
                    fi

                    echo "Disk after preflight:"
                    df -h / | tail -1

                    free_kb=$(df -Pk / | awk 'NR==2 {print $4}')
                    if [ "$free_kb" -lt 1048576 ]; then
                        echo "Still under 1GB free — the volume needs resizing."
                        echo "Failing here rather than part-way through a deploy."
                        exit 1
                    fi
                '''
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                dir("${APP_DIR}") {
                    sh 'docker build -t $IMAGE_NAME:$BUILD_NUMBER -t $IMAGE_NAME:latest .'
                }
            }
        }

        stage('Test') {
            steps {
                sh 'docker run --rm $IMAGE_NAME:$BUILD_NUMBER npm test'
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    docker stop $CONTAINER_NAME || true
                    docker rm $CONTAINER_NAME || true

                    # Named volume keeps posts.json across redeploys.
                    docker volume create $DATA_VOLUME > /dev/null

                    # ADMIN_PASSWORD lives on the host, not in git. Without it the
                    # blog still serves, but the admin area cannot be signed into.
                    # -r not -f: the docker client runs as the jenkins user, so the
                    # file existing is not enough — jenkins must be able to read it.
                    if [ -r "$ENV_FILE" ]; then
                        ENV_ARG="--env-file $ENV_FILE"
                        echo "Loading secrets from $ENV_FILE"
                    elif [ -f "$ENV_FILE" ]; then
                        ENV_ARG=""
                        echo "WARNING: $ENV_FILE exists but is not readable by $(whoami)."
                        echo "         Fix with: sudo chown root:jenkins $ENV_FILE && sudo chmod 640 $ENV_FILE"
                        echo "         Deploying without it — admin sign-in will be disabled."
                    else
                        ENV_ARG=""
                        echo "WARNING: $ENV_FILE not found — admin sign-in will be disabled."
                    fi

                    docker run -d \
                        --name $CONTAINER_NAME \
                        --restart unless-stopped \
                        -p ${PORT}:${PORT} \
                        -v $DATA_VOLUME:/app/data \
                        $ENV_ARG \
                        $IMAGE_NAME:$BUILD_NUMBER
                '''
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    echo "Waiting for the app to answer on port $PORT..."
                    for i in $(seq 1 20); do
                        if curl -fsS http://localhost:${PORT}/health > /dev/null 2>&1; then
                            echo "Health check passed after ${i} attempt(s)."
                            curl -s http://localhost:${PORT}/health
                            exit 0
                        fi
                        sleep 2
                    done

                    echo "Health check never passed. Container logs:"
                    docker logs --tail 40 $CONTAINER_NAME || true
                    exit 1
                '''
            }
        }
    }

    post {
        always {
            // The root volume is only 6.6GB and every build writes a full image.
            //
            // `docker image prune -f` alone was not enough: it removes *dangling*
            // images only, and each build here is tagged with its number, so
            // nothing was ever collected and the disk filled up at build #15.
            //
            // Volumes are deliberately never pruned — blog_data holds the posts.
            sh '''
                echo "Disk before cleanup:"
                df -h / | tail -1

                # Drop numbered tags beyond the three most recent builds.
                docker images "$IMAGE_NAME" --format '{{.Tag}}' \
                    | grep -E '^[0-9]+$' \
                    | sort -rn \
                    | tail -n +4 \
                    | while read -r old; do
                        echo "Removing $IMAGE_NAME:$old"
                        docker rmi "$IMAGE_NAME:$old" || true
                      done

                docker image prune -f || true
                docker builder prune -f || true

                echo "Disk after cleanup:"
                df -h / | tail -1
            '''
        }
        success {
            emailext(
                subject: "Deployed successfully — build #${BUILD_NUMBER}",
                body: """The NestJS app is live on EC2.

Blog:   ${PUBLIC_URL}/
Login:  ${PUBLIC_URL}/login
Health: ${PUBLIC_URL}/health

Build:  ${BUILD_URL}""",
                to: "${EMAIL}"
            )
        }
        failure {
            emailext(
                subject: "Deploy FAILED — build #${BUILD_NUMBER}",
                body: """The pipeline failed. The previously deployed container may still be running.

Console: ${BUILD_URL}console""",
                to: "${EMAIL}"
            )
        }
    }
}
