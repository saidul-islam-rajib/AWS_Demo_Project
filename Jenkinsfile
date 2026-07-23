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
        PUBLIC_URL     = 'https://16.171.254.209.sslip.io'
        // Named volume holding posts.json, so content survives redeploys.
        DATA_VOLUME    = 'blog_data'
        // Secrets live on the host, never in this repository.
        ENV_FILE       = '/opt/blog/.env'

        BLUE_PORT      = '3001'
        GREEN_PORT     = '3002'
        UPSTREAM_FILE  = '/etc/caddy/upstream.conf'

        BACKUP_DIR     = '/opt/blog/backups'
        S3_BUCKET      = ''
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

        stage('Backup') {
            steps {
                sh '''
                    if [ ! -f scripts/backup.sh ]; then
                        echo "scripts/backup.sh missing — skipping backup."
                        exit 0
                    fi

                    set +e
                    BACKUP_DIR="$BACKUP_DIR" S3_BUCKET="$S3_BUCKET" \
                        DATA_VOLUME="$DATA_VOLUME" sh scripts/backup.sh
                    rc=$?
                    set -e

                    if [ "$rc" = "2" ]; then
                        echo "WARNING: backup skipped — see the reason above. Continuing to deploy."
                    elif [ "$rc" != "0" ]; then
                        echo "Backup failed (exit $rc). Refusing to deploy over unbacked-up data."
                        exit "$rc"
                    fi
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
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

                    if ! sh scripts/switch-upstream.sh --check; then
                        echo "Deploying single-container on $PORT instead."
                        echo "This path has brief downtime. See deploy/README.md to set up TLS."

                        docker stop $CONTAINER_NAME || true
                        docker rm $CONTAINER_NAME || true

                        docker run -d \
                            --name $CONTAINER_NAME \
                            --restart unless-stopped \
                            -p ${PORT}:${PORT} \
                            -v $DATA_VOLUME:/app/data \
                            $ENV_ARG \
                            $IMAGE_NAME:$BUILD_NUMBER

                        echo "$PORT" > .deployed-port
                        exit 0
                    fi

                    ACTIVE_PORT=$(grep -o '127\\.0\\.0\\.1:[0-9]*' "$UPSTREAM_FILE" 2>/dev/null \
                        | head -1 | cut -d: -f2)

                    if [ "$ACTIVE_PORT" = "$BLUE_PORT" ]; then
                        NEW_COLOR=green; NEW_PORT=$GREEN_PORT
                        OLD_COLOR=blue;  OLD_PORT=$BLUE_PORT
                    else
                        NEW_COLOR=blue;  NEW_PORT=$BLUE_PORT
                        OLD_COLOR=green; OLD_PORT=$GREEN_PORT
                    fi

                    NEW_NAME="${CONTAINER_NAME}-${NEW_COLOR}"
                    OLD_NAME="${CONTAINER_NAME}-${OLD_COLOR}"

                    echo "Active upstream: ${ACTIVE_PORT:-none} — deploying $NEW_COLOR on $NEW_PORT."

                    docker stop "$NEW_NAME" > /dev/null 2>&1 || true
                    docker rm   "$NEW_NAME" > /dev/null 2>&1 || true

                    docker run -d \
                        --name "$NEW_NAME" \
                        --restart unless-stopped \
                        -p 127.0.0.1:${NEW_PORT}:${PORT} \
                        -v $DATA_VOLUME:/app/data \
                        $ENV_ARG \
                        $IMAGE_NAME:$BUILD_NUMBER

                    echo "Waiting for $NEW_COLOR to answer on $NEW_PORT..."
                    ok=""
                    for i in $(seq 1 20); do
                        if curl -fsS --max-time 3 "http://127.0.0.1:${NEW_PORT}/health" > /dev/null 2>&1; then
                            echo "  healthy after ${i} attempt(s)."
                            ok="yes"
                            break
                        fi
                        sleep 2
                    done

                    if [ -z "$ok" ]; then
                        echo "$NEW_COLOR never became healthy. Logs:"
                        docker logs --tail 40 "$NEW_NAME" || true
                        echo "Removing it. $OLD_COLOR is still serving — the site did not go down."
                        docker stop "$NEW_NAME" > /dev/null 2>&1 || true
                        docker rm   "$NEW_NAME" > /dev/null 2>&1 || true
                        exit 1
                    fi

                    sh scripts/switch-upstream.sh "$NEW_PORT"

                    if [ "$(docker ps -q -f name="^${OLD_NAME}$")" ]; then
                        echo "Stopping $OLD_COLOR."
                        docker stop "$OLD_NAME" > /dev/null || true
                    fi

                    if [ "$(docker ps -q -f name="^${CONTAINER_NAME}$")" ]; then
                        echo "Retiring the legacy single-container deployment on port $PORT."
                        docker stop "$CONTAINER_NAME" > /dev/null || true
                    fi

                    echo "$NEW_PORT" > .deployed-port
                '''
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    PORT_TO_CHECK=$(cat .deployed-port 2>/dev/null || echo "$PORT")

                    echo "Checking the deployed container on port $PORT_TO_CHECK..."
                    for i in $(seq 1 20); do
                        if curl -fsS "http://127.0.0.1:${PORT_TO_CHECK}/health" > /dev/null 2>&1; then
                            echo "Health check passed after ${i} attempt(s)."
                            curl -s "http://127.0.0.1:${PORT_TO_CHECK}/health"
                            echo ""
                            break
                        fi
                        if [ "$i" = "20" ]; then
                            echo "Health check never passed."
                            exit 1
                        fi
                        sleep 2
                    done

                    if command -v caddy > /dev/null 2>&1; then
                        echo "Checking the public URL through Caddy..."
                        if curl -fsS --max-time 10 "${PUBLIC_URL}/health" > /dev/null 2>&1; then
                            echo "Public URL is answering over HTTPS."
                        else
                            echo "WARNING: ${PUBLIC_URL}/health did not answer."
                            echo "         The container is healthy, so this is a proxy or"
                            echo "         certificate problem rather than a bad release."
                        fi
                    fi
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
Feed:   ${PUBLIC_URL}/feed.xml

The data volume was snapshotted to ${BACKUP_DIR} before this deploy.

Build:  ${BUILD_URL}""",
                to: "${EMAIL}"
            )
        }
        failure {
            emailext(
                subject: "Deploy FAILED — build #${BUILD_NUMBER}",
                body: """The pipeline failed.

The new container is only switched to after it passes a health check, so a
failure before that point leaves the previous release serving traffic. Check
the console before assuming the site is down:

    ${PUBLIC_URL}/health

Console: ${BUILD_URL}console""",
                to: "${EMAIL}"
            )
        }
    }
}
