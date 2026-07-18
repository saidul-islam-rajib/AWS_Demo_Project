pipeline {
    agent any

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '15'))
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
                    if [ -f "$ENV_FILE" ]; then
                        ENV_ARG="--env-file $ENV_FILE"
                        echo "Loading secrets from $ENV_FILE"
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
            // The root volume is small; drop dangling layers from previous builds.
            sh 'docker image prune -f || true'
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
