pipeline {
    agent any

    environment {
        CONTAINER_NAME = 'nestjs-app'
        IMAGE_NAME = 'nestjs-image'
        EMAIL = 'saidul.rajib.bd@gmail.com'
        PORT = '3000'
        APP_DIR = 'automation'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                dir("${APP_DIR}") {
                    sh 'docker build -t $IMAGE_NAME:$BUILD_NUMBER -t $IMAGE_NAME:latest .'
                }
            }
        }

        stage('Stop & Remove Previous Container') {
            steps {
                sh '''
                    docker stop $CONTAINER_NAME || true
                    docker rm $CONTAINER_NAME || true
                '''
            }
        }

        stage('Docker Container Run') {
            steps {
                sh '''
                    docker run -d \
                        --name $CONTAINER_NAME \
                        --restart unless-stopped \
                        -p ${PORT}:${PORT} \
                        $IMAGE_NAME:latest
                '''
            }
        }
    }

    post {
        success {
            emailext(
                subject: "NestJS App Deployed Successfully on EC2! (build #${BUILD_NUMBER})",
                body: "Your app is deployed! URL -> http://16.171.254.209:${PORT}/",
                to: "${EMAIL}"
            )
        }
        failure {
            emailext(
                subject: "NestJS App deploy FAILED (build #${BUILD_NUMBER})",
                body: "Build failed. Console: ${BUILD_URL}console",
                to: "${EMAIL}"
            )
        }
    }
}
